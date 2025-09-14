const { Pool } = require('pg');

// Database configuration for different environments
const getDatabaseConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isSupabase = (process.env.SUPABASE_DB_HOST || process.env.DB_HOST || '').includes('supabase.com');
    const isRender = (process.env.SUPABASE_DB_HOST || process.env.DB_HOST || '').includes('render.com');

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
            rejectUnauthorized: false,
            sslmode: 'require'
        };
    }

    return baseConfig;
};

const pool = new Pool(getDatabaseConfig());

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
        const client = await pool.connect();
        console.log('✅ Database connection test successful');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection test failed:', error.message);
        return false;
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    testConnection
};
