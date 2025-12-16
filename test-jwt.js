const jwt = require('jsonwebtoken');

// Test JWT token creation and verification
function testJWT() {
  console.log('🔍 Testing JWT Token...');
  
  const jwtSecret = 'your-super-secret-jwt-key-change-in-production';
  const payload = { id: 1, username: 'testuser' };
  
  console.log('📝 Payload:', payload);
  console.log('🔑 Secret:', jwtSecret);
  
  // Create token
  const token = jwt.sign(payload, jwtSecret);
  console.log('✅ Token created:', token);
  
  // Verify token
  try {
    const decoded = jwt.verify(token, jwtSecret);
    console.log('✅ Token verified:', decoded);
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
  }
  
  // Test with different secret
  const wrongSecret = 'wrong-secret';
  try {
    const decoded = jwt.verify(token, wrongSecret);
    console.log('❌ Token verified with wrong secret (this should not happen):', decoded);
  } catch (error) {
    console.log('✅ Token correctly rejected with wrong secret:', error.message);
  }
}

testJWT();
