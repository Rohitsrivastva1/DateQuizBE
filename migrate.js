const fs = require('fs');
const { Pool } = require('pg');

async function migrate() {
    // Database configuration for different environments
    const isProduction = process.env.NODE_ENV === 'production';
    const isSupabase = (process.env.SUPABASE_DB_HOST || '').includes('supabase.com');
    const isRender = (process.env.SUPABASE_DB_HOST || '').includes('render.com');

    const baseConfig = {
        host: process.env.SUPABASE_DB_HOST || 'localhost',
        port: process.env.SUPABASE_DB_PORT || process.env.DB_PORT || 5432,
        database: process.env.SUPABASE_DB_NAME || 'datequiz',
        user: process.env.SUPABASE_DB_USER || 'postgres',
        password: process.env.SUPABASE_DB_PASSWORD || '9695',
    };

    // Only use SSL for production environments
    if (isProduction || isSupabase || isRender) {
        baseConfig.ssl = {
            rejectUnauthorized: false,
            ca: process.env.SUPABASE_DB_CA
        };
        console.log('🔒 Using SSL connection for production environment');
    } else {
        console.log('🔓 Using non-SSL connection for local development');
    }
    console.log('🔒 SSL configuration:', baseConfig);
    const pool = new Pool(baseConfig);

    try {
        console.log('Starting database migration...');
        console.log('Environment:', process.env.NODE_ENV || 'development');
        console.log('DB Host:', baseConfig.host);

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