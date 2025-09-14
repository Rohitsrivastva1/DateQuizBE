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

async function createTodaysQuestion() {
  try {
    console.log('📝 Creating today\'s daily question...');

    // Get a random question from existing questions
    const questionResult = await pool.query(`
      SELECT question, category
      FROM daily_questions
      WHERE is_active = true
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (questionResult.rows.length === 0) {
      console.log('❌ No active questions found in database');
      return false;
    }

    const question = questionResult.rows[0];

    // Insert today's question with question_text and question_date
    await pool.query(`
      UPDATE daily_questions
      SET question_text = $1, question_date = CURRENT_DATE
      WHERE question = $1
    `, [question.question]);

    console.log('✅ Today\'s question created successfully!');
    console.log(`📋 Question: "${question.question}"`);
    console.log(`🏷️  Category: ${question.category}`);
    console.log(`📅 Date: ${new Date().toDateString()}`);

    return true;

  } catch (error) {
    console.error('❌ Error creating today\'s question:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

createTodaysQuestion();
