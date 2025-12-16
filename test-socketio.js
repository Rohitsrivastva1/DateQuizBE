const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Test Socket.IO connection
function testSocketIO() {
  console.log('🧪 Starting Socket.IO test...');
  
  // Create test JWT token
  const testToken = jwt.sign(
    { id: 1, username: 'testuser' }, 
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
  );
  
  const socket = io('http://localhost:5000', {
    auth: {
      token: testToken
    },
    transports: ['websocket', 'polling']
  });
  
  socket.on('connect', () => {
    console.log('✅ Socket.IO connected');
    
    // Test journal subscription
    setTimeout(() => {
      console.log('📝 Testing journal subscription...');
      socket.emit('subscribe_journal', { journalId: 'test-journal-123' });
    }, 1000);
    
    // Test typing indicator
    setTimeout(() => {
      console.log('⌨️ Testing typing indicator...');
      socket.emit('typing_start', { journalId: 'test-journal-123' });
    }, 2000);
    
    // Test message read receipt
    setTimeout(() => {
      console.log('📖 Testing message read receipt...');
      socket.emit('message_read', { messageId: 'test-msg-123', journalId: 'test-journal-123' });
    }, 3000);
  });
  
  socket.on('connected', (data) => {
    console.log('✅ Socket.IO authentication successful:', data);
  });
  
  socket.on('journal_subscribed', (data) => {
    console.log('✅ Successfully subscribed to journal:', data);
  });
  
  socket.on('new_message', (data) => {
    console.log('📨 Received new message:', data);
  });
  
  socket.on('user_typing', (data) => {
    console.log('⌨️ Received typing indicator:', data);
  });
  
  socket.on('message_read', (data) => {
    console.log('📖 Received message read receipt:', data);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('❌ Socket.IO disconnected:', reason);
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Socket.IO connection error:', error);
  });
  
  socket.on('error', (error) => {
    console.error('❌ Socket.IO error:', error);
  });
  
  // Close after test
  setTimeout(() => {
    console.log('🔌 Closing test connection...');
    socket.disconnect();
  }, 10000);
}

// Run test
testSocketIO();
