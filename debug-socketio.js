const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Simple debug test
function debugSocketIO() {
  console.log('🔍 Debug Socket.IO Connection...');
  
  // Create test JWT token
  const testToken = jwt.sign(
    { id: 1, username: 'testuser' }, 
    'your-super-secret-jwt-key-change-in-production'
  );
  
  console.log('🔑 Token:', testToken);
  
  const socket = io('http://localhost:5000', {
    auth: {
      token: testToken
    },
    query: {
      token: testToken
    },
    transports: ['polling'], // Start with polling only
    timeout: 5000,
    reconnection: false
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected!');
    socket.disconnect();
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
    console.error('❌ Error type:', error.type);
    console.error('❌ Error description:', error.description);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason);
  });
  
  // Timeout after 10 seconds
  setTimeout(() => {
    console.log('⏰ Test timeout');
    socket.disconnect();
    process.exit(1);
  }, 10000);
}

debugSocketIO();
