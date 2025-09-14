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

async function checkSchema() {
  try {
    console.log('🔍 Checking current database schema...');

    // Check if couple_names table exists and what columns it has
    const tableQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'couple_names'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    const result = await pool.query(tableQuery);

    console.log('📊 couple_names table columns:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    // Check if the table has any data
    const dataQuery = 'SELECT COUNT(*) FROM couple_names;';
    const dataResult = await pool.query(dataQuery);
    console.log(`📊 couple_names table has ${dataResult.rows[0].count} rows`);

  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
