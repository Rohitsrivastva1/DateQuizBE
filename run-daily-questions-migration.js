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

async function runMigration() {
  try {
    console.log('🚀 Starting Daily Questions migration...');
    
    // Read the SQL schema file
    const sqlPath = path.join(__dirname, 'daily_questions_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📖 SQL schema loaded successfully');
    
    // Execute the migration
    console.log('⚡ Executing database migration...');
    await pool.query(sql);
    
    console.log('✅ Daily Questions migration completed successfully!');
    console.log('📊 Tables created:');
    console.log('   - daily_questions');
    console.log('   - user_daily_answers');
    console.log('   - couple_names');
    console.log('   - user_streaks');
    console.log('   - love_meters');
    console.log('   - daily_notifications');
    console.log('   - Sample questions inserted');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '23505') {
      console.log('ℹ️  Some tables already exist, this is normal for re-runs');
    }
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();
