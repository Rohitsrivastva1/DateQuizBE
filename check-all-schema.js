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

async function checkAllSchema() {
  try {
    console.log('🔍 Checking all database tables schema...\n');

    // Check users table
    const usersQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    const usersResult = await pool.query(usersQuery);
    console.log('👤 users table:');
    usersResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    // Check daily_questions table
    const questionsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'daily_questions'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    const questionsResult = await pool.query(questionsQuery);
    console.log('\n❓ daily_questions table:');
    questionsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    // Check daily_notifications table
    const notificationsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'daily_notifications'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    const notificationsResult = await pool.query(notificationsQuery);
    console.log('\n🔔 daily_notifications table:');
    notificationsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkAllSchema();
