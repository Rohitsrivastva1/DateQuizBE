const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Complete chat flow test - simulates real user interaction
async function testCompleteChatFlow() {
  console.log('🧪 Starting Complete Chat Flow Test...');
  console.log('=' .repeat(70));
  console.log('This test simulates a complete chat conversation between two users');
  console.log('=' .repeat(70));
  
  // Create test tokens for two users (using JWT secret from .env file)
  const jwtSecret = 'your-super-secret-jwt-key-change-this-in-production-2024';
  const lynnToken = jwt.sign(
    { id: 1, username: 'lynn' }, 
    jwtSecret
  );
  
  const rajToken = jwt.sign(
    { id: 2, username: 'raj' }, 
    jwtSecret
  );
  
  console.log('👤 Lynn (User 1):', lynnToken.substring(0, 20) + '...');
  console.log('👤 Raj (User 2):', rajToken.substring(0, 20) + '...');
  
  const testJournalId = 'test-journal-' + Date.now();
  let testResults = {
    lynnConnected: false,
    rajConnected: false,
    lynnSubscribed: false,
    rajSubscribed: false,
    messagesSent: 0,
    messagesReceived: 0,
    typingIndicators: 0,
    reactions: 0,
    errors: []
  };
  
  // Lynn's socket
  const lynnSocket = io('http://localhost:5000', {
    auth: { token: lynnToken },
    transports: ['websocket', 'polling']
  });
  
  // Raj's socket
  const rajSocket = io('http://localhost:5000', {
    auth: { token: rajToken },
    transports: ['websocket', 'polling']
  });
  
  // Lynn's event handlers
  lynnSocket.on('connect', () => {
    console.log('✅ Lynn connected');
    testResults.lynnConnected = true;
  });
  
  lynnSocket.on('connected', (data) => {
    console.log('✅ Lynn authenticated');
  });
  
  lynnSocket.on('journal_subscribed', (data) => {
    console.log('✅ Lynn subscribed to journal');
    testResults.lynnSubscribed = true;
  });
  
  lynnSocket.on('new_message', (data) => {
    console.log('📨 Lynn received message:', data.data?.content);
    testResults.messagesReceived++;
  });
  
  lynnSocket.on('user_typing', (data) => {
    console.log('⌨️ Lynn sees typing indicator:', data.isTyping ? 'START' : 'STOP');
    testResults.typingIndicators++;
  });
  
  lynnSocket.on('reaction_updated', (data) => {
    console.log('😀 Lynn sees reaction update:', data.data?.reactions);
    testResults.reactions++;
  });
  
  lynnSocket.on('error', (error) => {
    console.error('❌ Lynn error:', error);
    testResults.errors.push(`Lynn: ${error}`);
  });
  
  // Raj's event handlers
  rajSocket.on('connect', () => {
    console.log('✅ Raj connected');
    testResults.rajConnected = true;
  });
  
  rajSocket.on('connected', (data) => {
    console.log('✅ Raj authenticated');
  });
  
  rajSocket.on('journal_subscribed', (data) => {
    console.log('✅ Raj subscribed to journal');
    testResults.rajSubscribed = true;
  });
  
  rajSocket.on('new_message', (data) => {
    console.log('📨 Raj received message:', data.data?.content);
    testResults.messagesReceived++;
  });
  
  rajSocket.on('user_typing', (data) => {
    console.log('⌨️ Raj sees typing indicator:', data.isTyping ? 'START' : 'STOP');
    testResults.typingIndicators++;
  });
  
  rajSocket.on('reaction_updated', (data) => {
    console.log('😀 Raj sees reaction update:', data.data?.reactions);
    testResults.reactions++;
  });
  
  rajSocket.on('error', (error) => {
    console.error('❌ Raj error:', error);
    testResults.errors.push(`Raj: ${error}`);
  });
  
  // Chat simulation
  setTimeout(async () => {
    if (testResults.lynnConnected && testResults.rajConnected) {
      console.log('\n📝 Both users subscribing to journal...');
      lynnSocket.emit('subscribe_journal', { journalId: testJournalId });
      rajSocket.emit('subscribe_journal', { journalId: testJournalId });
      
      setTimeout(async () => {
        if (testResults.lynnSubscribed && testResults.rajSubscribed) {
          console.log('\n💬 Starting chat simulation...');
          
          // Lynn sends first message
          console.log('\n1️⃣ Lynn sends: "Hey Raj! How are you?"');
          try {
            const response1 = await axios.post('http://localhost:5000/api/journal/messages', {
              journal_id: testJournalId,
              type: 'text',
              content: 'Hey Raj! How are you?'
            }, {
              headers: {
                'Authorization': `Bearer ${lynnToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response1.data.success) {
              testResults.messagesSent++;
              console.log('✅ Message 1 sent successfully');
            }
          } catch (error) {
            console.error('❌ Error sending message 1:', error.message);
            testResults.errors.push(`Message 1: ${error.message}`);
          }
          
          // Wait a bit, then Raj responds
          setTimeout(async () => {
            console.log('\n2️⃣ Raj sends: "Hi Lynn! I\'m doing great, thanks for asking!"');
            try {
              const response2 = await axios.post('http://localhost:5000/api/journal/messages', {
                journal_id: testJournalId,
                type: 'text',
                content: 'Hi Lynn! I\'m doing great, thanks for asking!'
              }, {
                headers: {
                  'Authorization': `Bearer ${rajToken}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response2.data.success) {
                testResults.messagesSent++;
                console.log('✅ Message 2 sent successfully');
              }
            } catch (error) {
              console.error('❌ Error sending message 2:', error.message);
              testResults.errors.push(`Message 2: ${error.message}`);
            }
            
            // Test typing indicators
            setTimeout(() => {
              console.log('\n⌨️ Testing typing indicators...');
              lynnSocket.emit('typing_start', { journalId: testJournalId });
              
              setTimeout(() => {
                lynnSocket.emit('typing_stop', { journalId: testJournalId });
              }, 2000);
            }, 2000);
            
            // Test reactions
            setTimeout(async () => {
              console.log('\n😀 Testing reactions...');
              try {
                // Get the first message ID to add a reaction
                const messagesResponse = await axios.get(`http://localhost:5000/api/journal/messages?journal_id=${testJournalId}`, {
                  headers: {
                    'Authorization': `Bearer ${lynnToken}`
                  }
                });
                
                if (messagesResponse.data.success && messagesResponse.data.data.length > 0) {
                  const firstMessage = messagesResponse.data.data[0];
                  console.log(`Adding reaction to message: ${firstMessage.message_id}`);
                  
                  const reactionResponse = await axios.post(`http://localhost:5000/api/journal/messages/${firstMessage.message_id}/reactions`, {
                    emoji: '❤️'
                  }, {
                    headers: {
                      'Authorization': `Bearer ${rajToken}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  if (reactionResponse.data.success) {
                    testResults.reactions++;
                    console.log('✅ Reaction added successfully');
                  }
                }
              } catch (error) {
                console.error('❌ Error adding reaction:', error.message);
                testResults.errors.push(`Reaction: ${error.message}`);
              }
            }, 4000);
            
          }, 3000);
        }
      }, 2000);
    }
  }, 3000);
  
  // Test results after 15 seconds
  setTimeout(() => {
    console.log('\n' + '=' .repeat(70));
    console.log('📊 COMPLETE CHAT FLOW TEST RESULTS:');
    console.log('=' .repeat(70));
    console.log(`✅ Lynn Connected: ${testResults.lynnConnected ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Raj Connected: ${testResults.rajConnected ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Lynn Subscribed: ${testResults.lynnSubscribed ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Raj Subscribed: ${testResults.rajSubscribed ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Messages Sent: ${testResults.messagesSent}/2`);
    console.log(`✅ Messages Received: ${testResults.messagesReceived}/4 (2 per user)`);
    console.log(`✅ Typing Indicators: ${testResults.typingIndicators}/2`);
    console.log(`✅ Reactions: ${testResults.reactions}/1`);
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    const allPassed = testResults.lynnConnected && testResults.rajConnected && 
                     testResults.lynnSubscribed && testResults.rajSubscribed &&
                     testResults.messagesSent >= 2 && testResults.messagesReceived >= 4 &&
                     testResults.errors.length === 0;
    
    console.log('\n' + '=' .repeat(70));
    console.log(`🎯 OVERALL RESULT: ${allPassed ? '✅ COMPLETE CHAT FLOW WORKS!' : '❌ CHAT FLOW FAILED'}`);
    console.log('=' .repeat(70));
    
    lynnSocket.disconnect();
    rajSocket.disconnect();
    process.exit(allPassed ? 0 : 1);
  }, 15000);
}

// Run the test
testCompleteChatFlow().catch(console.error);
