const { Pool } = require('pg');
const config = require('../../config/production');

const pool = new Pool(config.database);

// Test the connection
pool.on('connect', () => {
    console.log('Connected to the database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Test database connection on startup
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('Database connection test successful');
        client.release();
    } catch (error) {
        console.error('Database connection test failed:', error.message);
        console.error('Database config:', {
            host: config.database.host,
            port: config.database.port,
            database: config.database.database,
            user: config.database.user,
            ssl: config.database.ssl ? 'enabled' : 'disabled'
        });
        throw error;
    }
};

// Test connection when module is loaded
testConnection().catch(err => {
    console.error('Failed to connect to database:', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    testConnection
};