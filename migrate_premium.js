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

async function migratePremium() {
    const client = await pool.connect();
    
    try {
        console.log('Starting premium content migration...');
        console.log('Environment:', process.env.NODE_ENV || 'development');
        console.log('DB Host:', process.env.DB_HOST || 'localhost');

        // Read and execute premium subscription schema
        const fs = require('fs');
        const path = require('path');
        
        const subscriptionSchema = fs.readFileSync(path.join(__dirname, 'premium_subscription_schema.sql'), 'utf8');
        console.log('Creating premium subscription schema...');
        await client.query(subscriptionSchema);
        
        // Read and execute premium content data
        const premiumContent = fs.readFileSync(path.join(__dirname, 'premium_content_data.sql'), 'utf8');
        console.log('Inserting premium content data...');
        await client.query(premiumContent);
        
        console.log('✅ Premium content migration completed successfully!');
        
        // Verify the migration
        const result = await client.query('SELECT COUNT(*) as premium_packs FROM packs WHERE is_premium = true');
        console.log(`Premium packs created: ${result.rows[0].count}`);
        
        const questionsResult = await client.query('SELECT COUNT(*) as premium_questions FROM questions WHERE pack_id IN (SELECT id FROM packs WHERE is_premium = true)');
        console.log(`Premium questions created: ${questionsResult.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Premium migration failed:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Run migration if called directly
if (require.main === module) {
    migratePremium()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migratePremium };
