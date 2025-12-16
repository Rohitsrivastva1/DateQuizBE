const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Test reaction updates
async function testReactions() {
  console.log('🧪 Testing Reaction Updates...');
  console.log('=' .repeat(60));
  
  const jwtSecret = 'your-super-secret-jwt-key-change-this-in-production-2024';
  
  // Login as Lynn
  const lynnLogin = await axios.post('http://localhost:5000/api/auth/login', {
    username: 'Lynn',
    password: '123456'
  });
  
  const lynnToken = lynnLogin.data.token;
  const lynnUserId = lynnLogin.data.user.id;
  
  console.log('✅ Lynn logged in, User ID:', lynnUserId);
  
  // Login as Rs
  const rsLogin = await axios.post('http://localhost:5000/api/auth/login', {
    username: 'Rs',
    password: '1234567'
  });
  
  const rsToken = rsLogin.data.token;
  const rsUserId = rsLogin.data.user.id;
  
  console.log('✅ Rs logged in, User ID:', rsUserId);
  
  // Create Socket.IO connections
  const lynnSocket = io('http://localhost:5000', {
    auth: { token: lynnToken },
    query: { token: lynnToken },
    transports: ['websocket', 'polling']
  });
  
  const rsSocket = io('http://localhost:5000', {
    auth: { token: rsToken },
    query: { token: rsToken },
    transports: ['websocket', 'polling']
  });
  
  // Wait for connections
  await new Promise(resolve => {
    lynnSocket.on('connect', () => {
      console.log('✅ Lynn Socket.IO connected');
      resolve();
    });
  });
  
  await new Promise(resolve => {
    rsSocket.on('connect', () => {
      console.log('✅ Rs Socket.IO connected');
      resolve();
    });
  });
  
  // Subscribe to journal
  const journalId = '41';
  lynnSocket.emit('subscribe_journal', { journalId });
  rsSocket.emit('subscribe_journal', { journalId });
  console.log('📝 Both users subscribed to journal:', journalId);
  
  // Listen for reaction updates
  lynnSocket.on('reaction_updated', (data) => {
    console.log('🎭 Lynn received reaction update:', data);
  });
  
  rsSocket.on('reaction_updated', (data) => {
    console.log('🎭 Rs received reaction update:', data);
  });
  
  // Send a test message first
  console.log('\n💬 Sending test message...');
  const messageResponse = await axios.post(`http://localhost:5000/api/journal/${journalId}/messages`, {
    type: 'text',
    content: 'Test message for reactions'
  }, {
    headers: {
      'Authorization': `Bearer ${lynnToken}`,
      'Content-Type': 'application/json',
    }
  });
  
  if (messageResponse.data.success) {
    const messageId = messageResponse.data.data.message_id;
    console.log('✅ Message sent, ID:', messageId);
    
    // Wait a moment for the message to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add a reaction
    console.log('\n🎭 Adding reaction...');
    try {
      const reactionResponse = await axios.post(`http://localhost:5000/api/journal/${journalId}/messages/${messageId}/reactions`, {
        emoji: '😊'
      }, {
        headers: {
          'Authorization': `Bearer ${rsToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('✅ Reaction added:', reactionResponse.data);
      
      // Wait for Socket.IO updates
      console.log('\n⏳ Waiting for Socket.IO reaction updates...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error('❌ Error adding reaction:', error.response?.data || error.message);
    }
  }
  
  // Cleanup
  lynnSocket.disconnect();
  rsSocket.disconnect();
  console.log('\n🏁 Test completed');
}

testReactions().catch(console.error);


