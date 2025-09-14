require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'datequiz',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true,
});

async function checkTables() {
  try {
    console.log('📊 Checking all database tables...\n');

    // Get all table names
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('📋 Tables in database:');
    for (const row of tablesResult.rows) {
      console.log(`   - ${row.table_name}`);
    }

    console.log('\n🔍 Checking partner_requests table specifically...');

    // Check if partner_requests table exists
    const partnerRequestsResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'partner_requests';
    `);

    if (partnerRequestsResult.rows.length > 0) {
      console.log('✅ partner_requests table exists');

      // Check its structure
      const structureResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'partner_requests'
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `);

      console.log('📊 partner_requests table structure:');
      structureResult.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } else {
      console.log('❌ partner_requests table does NOT exist');
    }

  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
