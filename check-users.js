const { Pool } = require('pg');

// Check existing users in database
async function checkUsers() {
  console.log('🔍 Checking existing users...');
  
  const pool = new Pool({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.epluqupenltlffznbmcx',
    password: '9695700251@Rohit',
  });
  
  try {
    // Get all users
    const users = await pool.query('SELECT id, username, email, partner_id FROM users ORDER BY id');
    console.log('👥 Users in database:');
    users.rows.forEach(user => {
      console.log(`  ID: ${user.id}, Username: "${user.username}", Email: ${user.email}, Partner ID: ${user.partner_id}`);
    });
    
    // Find users with "Lynn" or "Rs" in username
    const lynnUsers = users.rows.filter(user => 
      user.username.toLowerCase().includes('lynn') || 
      user.username.toLowerCase().includes('rs')
    );
    
    console.log('\n🔍 Users with "Lynn" or "Rs" in username:');
    lynnUsers.forEach(user => {
      console.log(`  ID: ${user.id}, Username: "${user.username}", Email: ${user.email}, Partner ID: ${user.partner_id}`);
    });
    
    // Check for partners
    const partners = users.rows.filter(user => user.partner_id);
    console.log('\n👫 Users with partners:');
    partners.forEach(user => {
      const partner = users.rows.find(p => p.id === user.partner_id);
      console.log(`  ${user.username} (ID: ${user.id}) is partnered with ${partner?.username || 'Unknown'} (ID: ${user.partner_id})`);
    });
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers().catch(console.error);
