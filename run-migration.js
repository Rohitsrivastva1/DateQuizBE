const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration (using Supabase)
const pool = new Pool({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.epluqupenltlffznbmcx',
  password: '9695700251@Rohit',
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function runMigration() {
  try {
    console.log('🔄 Running journal migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_create_journal_tables_fixed.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%journal%' OR table_name LIKE '%message%' OR table_name LIKE '%reaction%'
      ORDER BY table_name;
    `);
    
    console.log('📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  Tables already exist, skipping...');
    } else {
      throw error;
    }
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
