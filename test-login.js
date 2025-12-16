const axios = require('axios');

// Test login for Lynn and Rs
async function testLogin() {
  console.log('🔐 Testing login for Lynn and Rs...');
  
  try {
    // Test Lynn login
    console.log('\n🔐 Testing Lynn login...');
    const lynnLogin = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'Lynn',
      password: '123456'
    });
    
    console.log('Lynn login response:', lynnLogin.data);
    
    // Test Rs login
    console.log('\n🔐 Testing Rs login...');
    const rsLogin = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'Rs',
      password: '1234567'
    });
    
    console.log('Rs login response:', rsLogin.data);
    
  } catch (error) {
    console.error('❌ Login error:', error.response?.data || error.message);
  }
}

testLogin().catch(console.error);
