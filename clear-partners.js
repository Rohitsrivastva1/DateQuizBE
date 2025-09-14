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

async function clearPartners() {
  try {
    console.log('🧹 Clearing old partner connections...');

    // Clear all partner connections in users table
    await pool.query('UPDATE users SET partner_id = NULL WHERE partner_id IS NOT NULL;');

    // Clear all couple_names records
    await pool.query('DELETE FROM couple_names;');

    console.log('✅ All partner connections cleared!');

    // Verify the changes
    const userQuery = `
      SELECT username, partner_id
      FROM users
      WHERE username IN ('test', 'test1');
    `;

    const userResult = await pool.query(userQuery);
    console.log('👥 Updated users:');
    userResult.rows.forEach(user => {
      console.log(`   - ${user.username}: partner_id = ${user.partner_id}`);
    });

    const coupleCount = await pool.query('SELECT COUNT(*) FROM couple_names;');
    console.log(`📊 couple_names table now has ${coupleCount.rows[0].count} records`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

clearPartners();
