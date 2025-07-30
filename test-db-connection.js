const { Pool } = require('pg');
const config = require('./config/production');

async function testDatabaseConnection() {
    console.log('Testing database connection...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    
    const pool = new Pool(config.database);
    
    try {
        const client = await pool.connect();
        console.log('✅ Database connection successful!');
        
        // Test a simple query
        const result = await client.query('SELECT NOW() as current_time');
        console.log('✅ Query test successful:', result.rows[0]);
        
        client.release();
        await pool.end();
        
        console.log('✅ All tests passed!');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Database config:', {
            host: config.database.host,
            port: config.database.port,
            database: config.database.database,
            user: config.database.user,
            ssl: config.database.ssl ? 'enabled' : 'disabled'
        });
        process.exit(1);
    }
}

testDatabaseConnection(); 