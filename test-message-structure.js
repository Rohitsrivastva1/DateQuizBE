const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Test message structure
async function testMessageStructure() {
  console.log('🧪 Testing Message Structure...');
  
  const jwtSecret = 'your-super-secret-jwt-key-change-this-in-production-2024';
  
  // Login as Lynn
  const lynnLogin = await axios.post('http://localhost:5000/api/auth/login', {
    username: 'Lynn',
    password: '123456'
  });
  
  const lynnToken = lynnLogin.data.token;
  const lynnUserId = lynnLogin.data.user.id;
  
  console.log('✅ Lynn logged in, User ID:', lynnUserId);
  
  // Create Socket.IO connection
  const socket = io('http://localhost:5000', {
    auth: { token: lynnToken },
    query: { token: lynnToken },
    transports: ['websocket', 'polling']
  });
  
  socket.on('connect', () => {
    console.log('✅ Socket.IO connected');
  });
  
  socket.on('connected', (data) => {
    console.log('✅ Authenticated:', data);
  });
  
  // Listen for messages with detailed logging
  socket.on('new_message', (messageData) => {
    console.log('\n📨 RECEIVED MESSAGE:');
    console.log('📨 Full messageData:', JSON.stringify(messageData, null, 2));
    console.log('📨 Type:', typeof messageData);
    console.log('📨 Has data property:', !!messageData.data);
    console.log('📨 Data type:', typeof messageData.data);
    if (messageData.data) {
      console.log('📨 Data keys:', Object.keys(messageData.data));
      console.log('📨 Has message_id:', !!messageData.data.message_id);
      console.log('📨 Message ID value:', messageData.data.message_id);
    }
  });
  
  // Wait for connection
  await new Promise(resolve => {
    socket.on('connect', resolve);
  });
  
  // Subscribe to journal
  const journalId = '41';
  socket.emit('subscribe_journal', { journalId });
  console.log('📝 Subscribed to journal:', journalId);
  
  // Wait a moment then send a test message
  setTimeout(async () => {
    try {
      console.log('\n💬 Sending test message...');
      const response = await axios.post(`http://localhost:5000/api/journal/${journalId}/messages`, {
        type: 'text',
        content: 'Test message for structure analysis'
      }, {
        headers: {
          'Authorization': `Bearer ${lynnToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Message sent, response:', response.data);
    } catch (error) {
      console.error('❌ Error sending message:', error.message);
    }
  }, 2000);
  
  // Wait for message and then exit
  setTimeout(() => {
    console.log('\n🏁 Test completed');
    socket.disconnect();
    process.exit(0);
  }, 10000);
}

testMessageStructure().catch(console.error);
