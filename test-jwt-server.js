const jwt = require('jsonwebtoken');
const axios = require('axios');

// Test JWT token against server
async function testJWTServer() {
  console.log('🔍 Testing JWT Token Against Server...');
  
  const jwtSecret = 'your-super-secret-jwt-key-change-in-production';
  const testToken = jwt.sign(
    { id: 1, username: 'testuser' }, 
    jwtSecret
  );
  
  console.log('🔑 Token:', testToken);
  
  // Test with a simple API endpoint that requires authentication
  try {
    console.log('\n📡 Testing token with API endpoint...');
    const response = await axios.get('http://localhost:5000/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    console.log('✅ API authentication successful:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('❌ API authentication failed:', error.response.status, error.response.data);
    } else {
      console.log('❌ API request failed:', error.message);
    }
  }
  
  // Test JWT verification manually
  console.log('\n🔍 Manual JWT verification...');
  try {
    const decoded = jwt.verify(testToken, jwtSecret);
    console.log('✅ JWT verification successful:', decoded);
  } catch (error) {
    console.log('❌ JWT verification failed:', error.message);
  }
  
  // Test with different JWT secret
  console.log('\n🔍 Testing with different JWT secret...');
  const differentSecret = 'different-secret';
  try {
    const decoded = jwt.verify(testToken, differentSecret);
    console.log('❌ JWT verification with wrong secret succeeded (this should not happen):', decoded);
  } catch (error) {
    console.log('✅ JWT verification with wrong secret correctly failed:', error.message);
  }
}

testJWTServer().catch(console.error);
