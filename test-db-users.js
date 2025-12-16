const { Pool } = require('pg');

// Test database users
async function testDBUsers() {
  console.log('🔍 Testing database users...');
  
  const pool = new Pool({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.epluqupenltlffznbmcx',
    password: '9695700251@Rohit',
  });
  
  try {
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    
    console.log('✅ Users table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Get all users
      const users = await pool.query('SELECT id, username, email FROM users LIMIT 10');
      console.log('👥 Users in database:', users.rows);
      
      // Check if test users exist
      const testUser1 = await pool.query('SELECT id, username FROM users WHERE id = 1');
      const testUser2 = await pool.query('SELECT id, username FROM users WHERE id = 2');
      
      console.log('👤 Test user 1 (ID 1):', testUser1.rows[0] || 'NOT FOUND');
      console.log('👤 Test user 2 (ID 2):', testUser2.rows[0] || 'NOT FOUND');
      
      // Create test users if they don't exist
      if (testUser1.rows.length === 0) {
        console.log('📝 Creating test user 1...');
        await pool.query(`
          INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
          VALUES (1, 'lynn', 'lynn@test.com', 'test-password', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `);
        console.log('✅ Test user 1 created');
      }
      
      if (testUser2.rows.length === 0) {
        console.log('📝 Creating test user 2...');
        await pool.query(`
          INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
          VALUES (2, 'raj', 'raj@test.com', 'test-password', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `);
        console.log('✅ Test user 2 created');
      }
      
      // Verify test users exist
      const finalUser1 = await pool.query('SELECT id, username FROM users WHERE id = 1');
      const finalUser2 = await pool.query('SELECT id, username FROM users WHERE id = 2');
      
      console.log('✅ Final test user 1:', finalUser1.rows[0]);
      console.log('✅ Final test user 2:', finalUser2.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

testDBUsers().catch(console.error);
