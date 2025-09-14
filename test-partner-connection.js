cdrequire('dotenv').config();
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

async function testPartnerConnection() {
  try {
    console.log('🧪 Testing partner connection logic...');

    // Test the query that was failing
    const testQuery = `
      SELECT couple_name
      FROM couple_names
      WHERE (user_id = $1 AND partner_id = $2) OR (user_id = $2 AND partner_id = $1)
    `;

    const result = await pool.query(testQuery, [3, 4]);
    console.log('✅ Query executed successfully!');
    console.log('📊 Result:', result.rows);

    // Test if users exist and their partner status
    const userQuery = `
      SELECT id, username, partner_id
      FROM users
      WHERE username IN ('test', 'test1');
    `;

    const userResult = await pool.query(userQuery);
    console.log('👥 Users found:');
    userResult.rows.forEach(user => {
      console.log(`   - ${user.username} (ID: ${user.id}): partner_id = ${user.partner_id}`);
    });

    // Check if there's already a connection between test (ID: 3) and test1 (ID: 4)
    const connectionQuery = `
      SELECT *
      FROM couple_names
      WHERE (user_id = 3 AND partner_id = 4) OR (user_id = 4 AND partner_id = 3);
    `;

    const connectionResult = await pool.query(connectionQuery);
    console.log('🔗 Connection check result:', connectionResult.rows);

    if (connectionResult.rows.length === 0) {
      console.log('✅ No existing connection found - users can be connected!');
    } else {
      console.log('⚠️  Users are already connected!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testPartnerConnection();
