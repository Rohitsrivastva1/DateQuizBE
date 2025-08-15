require('dotenv').config();
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'datequiz',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkDatabaseSchema() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Checking database schema...');
        
        // Check if user_subscriptions table exists
        const subscriptionTableResult = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'user_subscriptions'
            ) as exists;
        `);
        
        if (subscriptionTableResult.rows[0].exists) {
            console.log('✅ user_subscriptions table exists');
            
            // Check columns
            const subscriptionColumns = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'user_subscriptions'
                ORDER BY ordinal_position;
            `);
            
            console.log('📋 user_subscriptions columns:');
            subscriptionColumns.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type}`);
            });
        } else {
            console.log('❌ user_subscriptions table does not exist');
        }
        
        // Check if payment_history table exists
        const paymentTableResult = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'payment_history'
            ) as exists;
        `);
        
        if (paymentTableResult.rows[0].exists) {
            console.log('✅ payment_history table exists');
            
            // Check columns
            const paymentColumns = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'payment_history'
                ORDER BY ordinal_position;
            `);
            
            console.log('📋 payment_history columns:');
            paymentColumns.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type}`);
            });
        } else {
            console.log('❌ payment_history table does not exist');
        }
        
        // Check if users table exists
        const usersTableResult = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            ) as exists;
        `);
        
        if (usersTableResult.rows[0].exists) {
            console.log('✅ users table exists');
        } else {
            console.log('❌ users table does not exist');
        }
        
    } catch (error) {
        console.error('❌ Error checking database schema:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run check if called directly
if (require.main === module) {
    checkDatabaseSchema()
        .then(() => {
            console.log('Database schema check completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Database schema check failed:', error);
            process.exit(1);
        });
}

module.exports = { checkDatabaseSchema };
