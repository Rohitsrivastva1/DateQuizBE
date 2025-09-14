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

async function fixMissingColumns() {
  try {
    console.log('🔧 Fixing missing database columns...\n');

    // Add push_token column to users table
    console.log('📱 Adding push_token column to users table...');
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS push_token TEXT;
    `);

    // Add question_text and question_date columns to daily_questions table
    console.log('❓ Adding question_text and question_date columns to daily_questions table...');
    await pool.query(`
      ALTER TABLE daily_questions
      ADD COLUMN IF NOT EXISTS question_text TEXT,
      ADD COLUMN IF NOT EXISTS question_date DATE;
    `);

    // Add message column to daily_notifications table
    console.log('🔔 Adding message column to daily_notifications table...');
    await pool.query(`
      ALTER TABLE daily_notifications
      ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';
    `);

    console.log('\n✅ All missing columns added successfully!');

    // Verify the fixes
    console.log('\n🔍 Verifying fixes...\n');

    // Check users table
    const usersQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND table_schema = 'public'
      AND column_name IN ('id', 'username', 'push_token', 'partner_id')
      ORDER BY ordinal_position;
    `;
    const usersResult = await pool.query(usersQuery);
    console.log('👤 users table (key columns):');
    usersResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    // Check daily_questions table
    const questionsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'daily_questions'
      AND table_schema = 'public'
      AND column_name IN ('id', 'question', 'question_text', 'question_date', 'category')
      ORDER BY ordinal_position;
    `;
    const questionsResult = await pool.query(questionsQuery);
    console.log('\n❓ daily_questions table (key columns):');
    questionsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    // Check daily_notifications table
    const notificationsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'daily_notifications'
      AND table_schema = 'public'
      AND column_name IN ('id', 'user_id', 'title', 'message', 'notification_type')
      ORDER BY ordinal_position;
    `;
    const notificationsResult = await pool.query(notificationsQuery);
    console.log('\n🔔 daily_notifications table (key columns):');
    notificationsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n🎉 Database schema is now complete!');

  } catch (error) {
    console.error('❌ Error fixing columns:', error.message);
  } finally {
    await pool.end();
  }
}

fixMissingColumns();
