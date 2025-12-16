const { io } = require('socket.io-client');

// Simple Socket.IO test without authentication
function testSocketIOSimple() {
  console.log('🧪 Simple Socket.IO Test (No Auth)...');
  
  const socket = io('http://localhost:5000', {
    transports: ['polling'],
    timeout: 5000,
    reconnection: false
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected without authentication!');
    socket.disconnect();
  });
  
  socket.on('connect_error', (error) => {
    console.log('❌ Connection error:', error.message);
    console.log('❌ Error type:', error.type);
    console.log('❌ Error description:', error.description);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason);
  });
  
  setTimeout(() => {
    console.log('⏰ Test timeout');
    socket.disconnect();
    process.exit(1);
  }, 10000);
}

testSocketIOSimple();
