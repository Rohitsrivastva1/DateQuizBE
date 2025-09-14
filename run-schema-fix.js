require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration - using same config as main server
const getDatabaseConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isSupabase = (process.env.DB_HOST || '').includes('supabase.com');
    const isRender = (process.env.DB_HOST || '').includes('render.com');

    const baseConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'datequiz',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: true,
    };

    if (isProduction || isSupabase || isRender) {
        baseConfig.ssl = {
            rejectUnauthorized: false
        };
    }

    return baseConfig;
};

const pool = new Pool(getDatabaseConfig());

async function runSchemaFix() {
  try {
    console.log('🔧 Starting Partner Schema Fix...');

    // Read the SQL schema file
    const sqlPath = path.join(__dirname, 'fix-partner-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📖 SQL schema loaded successfully');

    // Execute the schema fix
    console.log('⚡ Executing database schema fix...');
    await pool.query(sql);

    console.log('✅ Partner Schema Fix completed successfully!');
    console.log('📊 Tables recreated:');
    console.log('   - daily_questions');
    console.log('   - user_daily_answers');
    console.log('   - couple_names (with user_id, partner_id)');
    console.log('   - love_meters (with user_id, partner_id)');
    console.log('   - daily_notifications');
    console.log('   - user_streaks');
    console.log('   - Sample questions inserted');

  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the schema fix
runSchemaFix();

