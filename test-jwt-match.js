const jwt = require('jsonwebtoken');

// Test JWT with exact same secret as server
function testJWTMatch() {
  console.log('🔍 Testing JWT with exact server secret...');
  
  // Use the exact same secret as the server
  const jwtSecret = 'your-super-secret-jwt-key-change-in-production';
  
  // Create token
  const token = jwt.sign(
    { id: 1, username: 'testuser' }, 
    jwtSecret
  );
  
  console.log('🔑 Token created:', token);
  
  // Verify with same secret
  try {
    const decoded = jwt.verify(token, jwtSecret);
    console.log('✅ JWT verification successful:', decoded);
  } catch (error) {
    console.log('❌ JWT verification failed:', error.message);
  }
  
  // Test with different secret to make sure it fails
  try {
    const decoded = jwt.verify(token, 'different-secret');
    console.log('❌ JWT verification with wrong secret succeeded (this should not happen):', decoded);
  } catch (error) {
    console.log('✅ JWT verification with wrong secret correctly failed:', error.message);
  }
  
  // Test with environment variable
  console.log('\n🔍 Testing with environment variable...');
  process.env.JWT_SECRET = jwtSecret;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ JWT verification with env var successful:', decoded);
  } catch (error) {
    console.log('❌ JWT verification with env var failed:', error.message);
  }
}

testJWTMatch();
