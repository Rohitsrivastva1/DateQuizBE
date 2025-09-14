const { Pool } = require('pg');

// Try multiple connection methods for better compatibility
const createPoolWithFallback = (config) => {
    return new Pool(config);
};

// Database configuration for different environments
const getDatabaseConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isSupabase = (process.env.SUPABASE_DB_HOST || process.env.DB_HOST || '').includes('supabase.com');
    const isRender = (process.env.SUPABASE_DB_HOST || process.env.DB_HOST || '').includes('render.com');

    // Check if we have a connection string (preferred for Supabase)
    let connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    
    // If no connection string, build one from individual components
    if (!connectionString && (isProduction || isSupabase || isRender)) {
        const host = process.env.SUPABASE_DB_HOST || process.env.DB_HOST;
        const port = process.env.SUPABASE_DB_PORT || process.env.DB_PORT;
        const database = process.env.SUPABASE_DB_NAME || process.env.DB_NAME;
        const user = process.env.SUPABASE_DB_USER || process.env.DB_USER;
        const password = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;
        
        if (host && port && database && user && password) {
            connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}?sslmode=require`;
            console.log('🔗 Built connection string from individual components');
        }
    }
    
    if (connectionString) {
        console.log('🔗 Using connection string for database');
        console.log('🔍 Connection string preview:', connectionString.replace(/:[^@]*@/, ':***@'));
        
        return {
            connectionString: connectionString,
            // Don't override SSL when using connection string - let the connection string handle it
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            allowExitOnIdle: true,
        };
    }

    const baseConfig = {
        host: process.env.SUPABASE_DB_HOST || process.env.DB_HOST || 'localhost',
        port: process.env.SUPABASE_DB_PORT || process.env.DB_PORT || 5432,
        database: process.env.SUPABASE_DB_NAME || process.env.DB_NAME || 'datequiz',
        user: process.env.SUPABASE_DB_USER || process.env.DB_USER || 'postgres',
        password: process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD || '',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: true,
    };

    // Log database configuration for debugging
    console.log('🔍 Database Configuration:');
    console.log('  Host:', baseConfig.host);
    console.log('  Port:', baseConfig.port);
    console.log('  Database:', baseConfig.database);
    console.log('  User:', baseConfig.user);
    console.log('  Password:', baseConfig.password ? '***' : 'not set');
    console.log('  Production:', isProduction);
    console.log('  Supabase:', isSupabase);
    console.log('  Render:', isRender);

    // ✅ Proper SSL configuration for production databases
    if (isProduction || isSupabase || isRender) {
        console.log('✅ SSL configuration for production database');
        baseConfig.ssl = {
            rejectUnauthorized: false
        };
    }

    return baseConfig;
};

const pool = createPoolWithFallback(getDatabaseConfig());

// Log connection status
pool.on('connect', () => {
    console.log('✅ Connected to the database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    if (process.env.NODE_ENV !== 'production') {
        process.exit(-1);
    }
});

// Connection test function
const testConnection = async () => {
    try {
        console.log('🔄 Attempting database connection...');
        const client = await pool.connect();
        console.log('✅ Database connection test successful');
        
        // Test a simple query
        const result = await client.query('SELECT NOW() as current_time');
        console.log('✅ Query test successful:', result.rows[0]);
        
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection test failed:', error.message);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error detail:', error.detail);
        console.error('❌ Error hint:', error.hint);
        
        // Log specific error types
        if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
            console.log('💡 SSL Certificate Issue: Self-signed certificate detected');
            console.log('💡 This usually means the SSL certificate chain is not trusted');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('💡 Connection Refused: Database server is not reachable');
        } else if (error.code === 'ENOTFOUND') {
            console.log('💡 DNS Issue: Cannot resolve database hostname');
        } else if (error.message.includes('SASL')) {
            console.log('💡 SASL Authentication Issue: SCRAM authentication failed');
        }
        
        return false;
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    testConnection
};
