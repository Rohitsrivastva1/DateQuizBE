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

async function populateNewColumns() {
  try {
    console.log('📝 Populating new columns with data...\n');

    // Populate question_text column with data from question column
    console.log('❓ Populating question_text column...');
    await pool.query(`
      UPDATE daily_questions
      SET question_text = question
      WHERE question_text IS NULL OR question_text = '';
    `);

    // Populate question_date column with today's date for existing questions
    console.log('📅 Populating question_date column...');
    await pool.query(`
      UPDATE daily_questions
      SET question_date = CURRENT_DATE
      WHERE question_date IS NULL;
    `);

    console.log('\n✅ New columns populated successfully!');

    // Verify the data
    const result = await pool.query(`
      SELECT id, question, question_text, question_date, category
      FROM daily_questions
      LIMIT 3;
    `);

    console.log('\n🔍 Sample data:');
    result.rows.forEach(row => {
      console.log(`   ID ${row.id}: "${row.question}"`);
      console.log(`      -> question_text: "${row.question_text}"`);
      console.log(`      -> question_date: ${row.question_date}`);
      console.log(`      -> category: ${row.category}\n`);
    });

    const countQuery = await pool.query('SELECT COUNT(*) FROM daily_questions;');
    console.log(`📊 Total questions: ${countQuery.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error populating columns:', error.message);
  } finally {
    await pool.end();
  }
}

populateNewColumns();
