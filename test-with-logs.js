const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Test with detailed logging
function testWithLogs() {
  console.log('🔍 Testing with detailed logging...');
  console.log('⏰ Starting test at:', new Date().toISOString());
  
  const jwtSecret = 'your-super-secret-jwt-key-change-in-production';
  const testToken = jwt.sign(
    { id: 1, username: 'testuser' }, 
    jwtSecret
  );
  
  console.log('🔑 Token created at:', new Date().toISOString());
  console.log('🔑 Token:', testToken.substring(0, 50) + '...');
  
  const socket = io('http://localhost:5000', {
    auth: { token: testToken },
    query: { token: testToken },
    transports: ['polling'],
    timeout: 10000,
    reconnection: false,
    forceNew: true
  });
  
  console.log('🔌 Socket created at:', new Date().toISOString());
  
  socket.on('connect', () => {
    console.log('✅ Connected at:', new Date().toISOString());
    socket.disconnect();
  });
  
  socket.on('connect_error', (error) => {
    console.log('❌ Connection error at:', new Date().toISOString());
    console.log('❌ Error message:', error.message);
    console.log('❌ Error type:', error.type);
    console.log('❌ Error description:', error.description);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected at:', new Date().toISOString(), 'Reason:', reason);
  });
  
  // Log every second
  let counter = 0;
  const interval = setInterval(() => {
    counter++;
    console.log(`⏰ ${counter}s - Still waiting...`);
    if (counter >= 10) {
      clearInterval(interval);
      console.log('⏰ Test timeout after 10 seconds');
      socket.disconnect();
      process.exit(1);
    }
  }, 1000);
}

testWithLogs();
