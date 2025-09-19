const { Pool } = require('pg');

// Database configuration for different environments
const getDatabaseConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Use environment variables for database configuration
    const config = {
        host: process.env.DB_HOST || process.env.SUPABASE_DB_HOST || 'aws-0-ap-southeast-1.pooler.supabase.com',
        port: parseInt(process.env.DB_PORT || process.env.SUPABASE_DB_PORT || '6543'),
        database: process.env.DB_NAME || process.env.SUPABASE_DB_NAME || 'postgres',
        user: process.env.DB_USER || process.env.SUPABASE_DB_USER || 'postgres.epluqupenltlffznbmcx',
        password: process.env.DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD || '9695700251@Rohit',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };
    
    // Configure SSL and connection options based on environment
    if (isProduction) {
        // Production SSL configuration for Supabase
        config.ssl = {
            rejectUnauthorized: false,
            require: true,
            checkServerIdentity: () => undefined
        };
        // Additional connection options for production
        config.application_name = 'datequiz-backend';
        config.statement_timeout = 30000;
        config.query_timeout = 30000;
        // Connection pool settings for production
        config.max = 10;
        config.idleTimeoutMillis = 10000;
        config.connectionTimeoutMillis = 5000;
    } else {
        // Development SSL configuration
        config.ssl = { rejectUnauthorized: false };
    }
    
    return config;
};

const pool = new Pool(getDatabaseConfig());

// Test the connection
pool.on('connect', () => {
    console.log('✅ Connected to the database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
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
            console.log('💡 This usually indicates SSL/TLS configuration problems');
            console.log('💡 Try checking your SSL settings and connection parameters');
        } else if (error.message.includes('SCRAM-SERVER-FINAL-MESSAGE')) {
            console.log('💡 SCRAM Authentication Error: Server signature verification failed');
            console.log('💡 This often happens with SSL configuration issues');
            console.log('💡 Check if your SSL settings are correct for Supabase');
        }
        
        return false;
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    testConnection
};