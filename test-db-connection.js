require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing Database Connection...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('DB Host:', process.env.DB_HOST || 'localhost');
console.log('DB Port:', process.env.DB_PORT || 5432);
console.log('DB Name:', process.env.DB_NAME || 'datequiz');
console.log('DB User:', process.env.DB_USER || 'postgres');

const testConnection = async () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isSupabase = (process.env.DB_HOST || '').includes('supabase.com');
    const isRender = (process.env.DB_HOST || '').includes('render.com');

    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'datequiz',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        connectionTimeoutMillis: 10000,
        acquireTimeoutMillis: 10000,
    };

    // SSL configuration for production environments
    if (isProduction || isSupabase || isRender) {
        console.log('🔒 Using SSL connection');
        config.ssl = {
            rejectUnauthorized: false,
            sslmode: 'require'
        };
    } else {
        console.log('🔓 Using non-SSL connection');
    }

    const pool = new Pool(config);

    try {
        console.log('🔄 Attempting to connect...');
        const client = await pool.connect();
        console.log('✅ Connection successful!');
        
        // Test a simple query
        const result = await client.query('SELECT NOW() as current_time');
        console.log('✅ Query test successful:', result.rows[0]);
        
        client.release();
        await pool.end();
        return true;
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.error('Error code:', error.code);
        console.error('Error detail:', error.detail);
        
        if (error.message.includes('SASL') || error.message.includes('SCRAM')) {
            console.log('\n💡 SASL Authentication Error Detected');
            console.log('This usually indicates:');
            console.log('1. SSL configuration issues');
            console.log('2. Database credentials problems');
            console.log('3. Network connectivity issues');
            console.log('4. Database server configuration problems');
        }
        
        await pool.end();
        return false;
    }
};

testConnection().then(success => {
    if (success) {
        console.log('\n🎉 Database connection test passed!');
        process.exit(0);
    } else {
        console.log('\n💥 Database connection test failed!');
        process.exit(1);
    }
}).catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
}); 