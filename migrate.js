const fs = require('fs');
const { Pool } = require('pg');

async function migrate() {
    const pool = new Pool({
        host: process.env.SUPABASE_DB_HOST || process.env.DB_HOST,
        port: process.env.SUPABASE_DB_PORT || process.env.DB_PORT || 5432,
        database: process.env.SUPABASE_DB_NAME || process.env.DB_NAME,
        user: process.env.SUPABASE_DB_USER || process.env.DB_USER,
        password: process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD,
        ssl: {
            rejectUnauthorized: false,
            ca: process.env.SUPABASE_DB_CA
        }
    });

    try {
        console.log('Starting database migration for Supabase...');

        // Read SQL files
        const schemaSQL = fs.readFileSync('./partner_turn_schema.sql', 'utf8');
        const dataSQL = fs.readFileSync('./partner_decks_data.sql', 'utf8');

        // Execute schema
        console.log('Creating schema...');
        await pool.query(schemaSQL);

        // Execute data
        console.log('Inserting initial data...');
        await pool.query(dataSQL);

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate(); 