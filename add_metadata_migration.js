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

async function addMetadataColumns() {
    const client = await pool.connect();
    
    try {
        console.log('Starting metadata columns migration...');
        
        // Read the SQL file
        const sqlPath = path.join(__dirname, 'add_metadata_columns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Execute the migration
        console.log('Adding metadata columns...');
        await client.query(sql);
        
        console.log('✅ Metadata columns migration completed successfully!');
        
        // Verify the migration
        const result = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_subscriptions' 
            AND column_name = 'metadata'
        `);
        
        if (result.rows.length > 0) {
            console.log('✅ Metadata column exists in user_subscriptions table');
        } else {
            console.log('❌ Metadata column not found in user_subscriptions table');
        }
        
        const paymentResult = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'payment_history' 
            AND column_name = 'metadata'
        `);
        
        if (paymentResult.rows.length > 0) {
            console.log('✅ Metadata column exists in payment_history table');
        } else {
            console.log('❌ Metadata column not found in payment_history table');
        }
        
    } catch (error) {
        console.error('❌ Metadata migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration if called directly
if (require.main === module) {
    addMetadataColumns()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { addMetadataColumns };
