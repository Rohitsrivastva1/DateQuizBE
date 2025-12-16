const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Debug Socket.IO authentication
function testSocketIODebug() {
  console.log('🔍 Debug Socket.IO Authentication...');
  
  const jwtSecret = 'your-super-secret-jwt-key-change-in-production';
  const testToken = jwt.sign(
    { id: 1, username: 'testuser' }, 
    jwtSecret
  );
  
  console.log('🔑 Token:', testToken);
  console.log('🔑 Token length:', testToken.length);
  
  // Verify token manually first
  try {
    const decoded = jwt.verify(testToken, jwtSecret);
    console.log('✅ Manual JWT verification successful:', decoded);
  } catch (error) {
    console.log('❌ Manual JWT verification failed:', error.message);
    return;
  }
  
  const socket = io('http://localhost:5000', {
    auth: { token: testToken },
    query: { token: testToken },
    transports: ['polling'],
    timeout: 10000,
    reconnection: false
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected successfully!');
    socket.disconnect();
  });
  
  socket.on('connect_error', (error) => {
    console.log('❌ Connection error:', error.message);
    console.log('❌ Error type:', error.type);
    console.log('❌ Error description:', error.description);
    console.log('❌ Full error:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason);
  });
  
  // Timeout after 15 seconds
  setTimeout(() => {
    console.log('⏰ Test timeout');
    socket.disconnect();
    process.exit(1);
  }, 15000);
}

testSocketIODebug();
