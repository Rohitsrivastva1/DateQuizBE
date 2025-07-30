const { Pool } = require('pg');
const config = require('../../config/production');

let pool;
let isDirectConnection = false;
let connectionType = '';

// Function to create pool with specific config
const createPool = (dbConfig) => {
    return new Pool({
        ...dbConfig,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
    });
};

// Test database connection on startup
const testConnection = async () => {
    const connectionConfigs = [
        { name: 'Pooler (No SSL)', config: config.database, type: 'pooler-no-ssl' },
        { name: 'Direct (No SSL)', config: config.databaseDirect, type: 'direct-no-ssl' },
        { name: 'Pooler (SSL)', config: config.databaseSSL, type: 'pooler-ssl' },
        { name: 'Direct (SSL)', config: config.databaseDirectSSL, type: 'direct-ssl' }
    ];

    for (const { name, config: dbConfig, type } of connectionConfigs) {
        try {
            console.log(`🔄 Testing ${name} connection...`);
            
            const testPool = createPool(dbConfig);
            const client = await testPool.connect();
            
            console.log(`✅ ${name} database connection successful`);
            
            // Test a simple query
            const result = await client.query('SELECT NOW() as current_time');
            console.log(`✅ ${name} query test successful:`, result.rows[0]);
            
            client.release();
            await testPool.end();
            
            // Use this configuration for the main pool
            pool = createPool(dbConfig);
            isDirectConnection = name.includes('Direct');
            connectionType = type;
            
            console.log(`✅ Using ${name} connection for the application`);
            console.log(`🔧 Connection type: ${type}`);
            return;
            
        } catch (error) {
            console.error(`❌ ${name} connection failed:`, error.message);
            console.error(`${name} config:`, {
                host: dbConfig.host,
                port: dbConfig.port,
                database: dbConfig.database,
                user: dbConfig.user,
                ssl: dbConfig.ssl ? (typeof dbConfig.ssl === 'object' ? 'enabled-with-config' : 'enabled') : 'disabled'
            });
        }
    }
    
    throw new Error('All database connection attempts failed');
};

// Create initial pool (will be replaced by testConnection)
pool = createPool(config.database);

// Test the connection
pool.on('connect', () => {
    console.log('Connected to the database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Test connection when module is loaded
testConnection().catch(err => {
    console.error('Failed to connect to database:', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    testConnection,
    isDirectConnection: () => isDirectConnection,
    getConnectionType: () => connectionType
};