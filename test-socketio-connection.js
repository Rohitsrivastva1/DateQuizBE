const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Test Socket.IO connection and basic functionality
function testSocketIOConnection() {
  console.log('🧪 Starting Socket.IO Connection Test...');
  console.log('=' .repeat(50));
  
  // Create test JWT token with the same secret as the server (from .env file)
  const jwtSecret = 'your-super-secret-jwt-key-change-this-in-production-2024';
  const testToken = jwt.sign(
    { id: 1, username: 'testuser' }, 
    jwtSecret
  );
  
  console.log('🔑 Test token created:', testToken.substring(0, 20) + '...');
  
  const socket = io('http://localhost:5000', {
    auth: {
      token: testToken
    },
    query: {
      token: testToken
    },
    transports: ['websocket', 'polling'],
    timeout: 10000,
    reconnection: false
  });
  
  let testResults = {
    connected: false,
    authenticated: false,
    journalSubscribed: false,
    messageReceived: false,
    errors: []
  };
  
  // Connection events
  socket.on('connect', () => {
    console.log('✅ Socket.IO connected successfully');
    testResults.connected = true;
  });
  
  socket.on('connected', (data) => {
    console.log('✅ Authentication successful:', data);
    testResults.authenticated = true;
  });
  
  socket.on('journal_subscribed', (data) => {
    console.log('✅ Journal subscription successful:', data);
    testResults.journalSubscribed = true;
  });
  
  socket.on('new_message', (data) => {
    console.log('📨 Received new message:', data);
    testResults.messageReceived = true;
  });
  
  socket.on('error', (error) => {
    console.error('❌ Socket.IO error:', error);
    testResults.errors.push(error);
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
    testResults.errors.push(error.message);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason);
  });
  
  // Test sequence
  setTimeout(async () => {
    if (testResults.connected && testResults.authenticated) {
      console.log('\n📝 Testing journal subscription...');
      socket.emit('subscribe_journal', { journalId: 'test-journal-123' });
      
      setTimeout(() => {
        console.log('\n⌨️ Testing typing indicator...');
        socket.emit('typing_start', { journalId: 'test-journal-123' });
        
        setTimeout(() => {
          socket.emit('typing_stop', { journalId: 'test-journal-123' });
        }, 2000);
      }, 1000);
      
      setTimeout(() => {
        console.log('\n📖 Testing message read receipt...');
        socket.emit('message_read', { 
          messageId: 'test-msg-123', 
          journalId: 'test-journal-123' 
        });
      }, 3000);
    }
  }, 2000);
  
  // Test results after 8 seconds
  setTimeout(() => {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST RESULTS:');
    console.log('=' .repeat(50));
    console.log(`✅ Connected: ${testResults.connected ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Authenticated: ${testResults.authenticated ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Journal Subscribed: ${testResults.journalSubscribed ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Message Received: ${testResults.messageReceived ? 'PASS' : 'FAIL'}`);
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    const allPassed = testResults.connected && testResults.authenticated && 
                     testResults.journalSubscribed && testResults.errors.length === 0;
    
    console.log('\n' + '=' .repeat(50));
    console.log(`🎯 OVERALL RESULT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('=' .repeat(50));
    
    socket.disconnect();
    process.exit(allPassed ? 0 : 1);
  }, 8000);
}

// Run the test
testSocketIOConnection();
