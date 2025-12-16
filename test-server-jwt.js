const jwt = require('jsonwebtoken');

// Test what JWT secret the server is actually using
function testServerJWT() {
  console.log('🔍 Testing server JWT secret...');
  
  // Test with the default secret
  const defaultSecret = 'your-super-secret-jwt-key-change-in-production';
  const token = jwt.sign({ id: 1, username: 'testuser' }, defaultSecret);
  
  console.log('🔑 Token with default secret:', token);
  
  // Test with different possible secrets
  const possibleSecrets = [
    'your-super-secret-jwt-key-change-in-production',
    'your-super-secret-jwt-key-change-in-production',
    'jwt-secret-key',
    'secret',
    'my-secret-key',
    'datequiz-secret',
    'super-secret-key'
  ];
  
  console.log('\n🔍 Testing with different secrets...');
  possibleSecrets.forEach((secret, index) => {
    try {
      const decoded = jwt.verify(token, secret);
      console.log(`✅ Secret ${index + 1} (${secret}): SUCCESS`, decoded);
    } catch (error) {
      console.log(`❌ Secret ${index + 1} (${secret}): FAILED - ${error.message}`);
    }
  });
  
  // Test with environment variable
  console.log('\n🔍 Testing with environment variable...');
  console.log('JWT_SECRET env var:', process.env.JWT_SECRET || 'NOT SET');
  
  if (process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ JWT verification with env var successful:', decoded);
    } catch (error) {
      console.log('❌ JWT verification with env var failed:', error.message);
    }
  }
}

testServerJWT();
