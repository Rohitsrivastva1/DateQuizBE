const { Pool } = require('pg');

// Database configuration for different environments
const getDatabaseConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isSupabase = (process.env.DB_HOST || '').includes('supabase.com');
    const isRender = (process.env.DB_HOST || '').includes('render.com');

    const baseConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'datequiz',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: true,
    };

    // ✅ Proper SSL configuration
    if (isProduction || isSupabase || isRender) {
        console.log('✅ SSL configuration');
        baseConfig.ssl = {
            rejectUnauthorized: false
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
