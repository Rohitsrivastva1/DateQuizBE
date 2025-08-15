require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'datequiz',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createSubscriptionTables() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Creating subscription tables...');
        
        // Read the SQL file
        const sqlPath = path.join(__dirname, 'create_subscription_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Execute the schema
        console.log('📝 Executing subscription schema...');
        await client.query(sql);
        
        console.log('✅ Subscription tables created successfully!');
        
        // Verify the tables were created
        const tables = ['user_subscriptions', 'payment_history', 'premium_content_access'];
        
        for (const table of tables) {
            const result = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                ) as exists;
            `, [table]);
            
            if (result.rows[0].exists) {
                console.log(`✅ ${table} table exists`);
            } else {
                console.log(`❌ ${table} table was not created`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error creating subscription tables:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run creation if called directly
if (require.main === module) {
    createSubscriptionTables()
        .then(() => {
            console.log('Subscription tables creation completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Subscription tables creation failed:', error);
            process.exit(1);
        });
}

module.exports = { createSubscriptionTables };
