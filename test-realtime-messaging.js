const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Test real-time messaging between two users
async function testRealtimeMessaging() {
  console.log('🧪 Starting Real-Time Messaging Test...');
  console.log('=' .repeat(60));
  
  // Create test tokens for two users (using JWT secret from .env file)
  const jwtSecret = 'your-super-secret-jwt-key-change-this-in-production-2024';
  const user1Token = jwt.sign(
    { id: 1, username: 'lynn' }, 
    jwtSecret
  );
  
  const user2Token = jwt.sign(
    { id: 2, username: 'raj' }, 
    jwtSecret
  );
  
  console.log('👤 User 1 (Lynn):', user1Token.substring(0, 20) + '...');
  console.log('👤 User 2 (Raj):', user2Token.substring(0, 20) + '...');
  
  // Create two socket connections
  const lynnSocket = io('http://localhost:5000', {
    auth: { token: user1Token },
    transports: ['websocket', 'polling']
  });
  
  const rajSocket = io('http://localhost:5000', {
    auth: { token: user2Token },
    transports: ['websocket', 'polling']
  });
  
  const testJournalId = 'test-journal-' + Date.now();
  let testResults = {
    lynnConnected: false,
    rajConnected: false,
    lynnSubscribed: false,
    rajSubscribed: false,
    messageSent: false,
    messageReceived: false,
    errors: []
  };
  
  // Lynn's socket events
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
    testResults.messageReceived = true;
  });
  
  lynnSocket.on('error', (error) => {
    console.error('❌ Lynn error:', error);
    testResults.errors.push(`Lynn: ${error}`);
  });
  
  // Raj's socket events
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
    testResults.messageReceived = true;
  });
  
  rajSocket.on('error', (error) => {
    console.error('❌ Raj error:', error);
    testResults.errors.push(`Raj: ${error}`);
  });
  
  // Test sequence
  setTimeout(async () => {
    if (testResults.lynnConnected && testResults.rajConnected) {
      console.log('\n📝 Both users subscribing to journal...');
      lynnSocket.emit('subscribe_journal', { journalId: testJournalId });
      rajSocket.emit('subscribe_journal', { journalId: testJournalId });
      
      setTimeout(async () => {
        if (testResults.lynnSubscribed && testResults.rajSubscribed) {
          console.log('\n👫 Creating couple relationship first...');
          
          try {
            // First, try to approve any existing partner request
            try {
              const approveResponse = await axios.post('http://localhost:5000/api/partner/request/respond', {
                requestId: 1, // Use the existing request ID
                response: 'approved'
              }, {
                headers: {
                  'Authorization': `Bearer ${user2Token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (approveResponse.data.success) {
                console.log('✅ Existing partner request approved');
              }
            } catch (approveError) {
              console.log('ℹ️ No existing request to approve, creating new one...');
              
              // Create couple relationship between users 1 and 2
              const coupleResponse = await axios.post('http://localhost:5000/api/partner/request', {
                receiverUsername: 'raj'
              }, {
                headers: {
                  'Authorization': `Bearer ${user1Token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (coupleResponse.data.success) {
                console.log('✅ Partner request sent');
                
                // Approve the request
                const approveResponse = await axios.post('http://localhost:5000/api/partner/request/respond', {
                  requestId: coupleResponse.data.data.id,
                  response: 'approved'
                }, {
                  headers: {
                    'Authorization': `Bearer ${user2Token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (approveResponse.data.success) {
                  console.log('✅ Partner request approved');
                }
              }
            }
            
            console.log('✅ Couple relationship established');
              
              console.log('\n📝 Creating journal...');
              
              // Create a journal first
              const today = new Date().toISOString().split('T')[0];
              const journalResponse = await axios.post(`http://localhost:5000/api/journal/1/date/${today}`, {
                theme: 'Test Journal',
                isPrivate: false
              }, {
                headers: {
                  'Authorization': `Bearer ${user1Token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (journalResponse.data.success) {
                const journalId = journalResponse.data.data.journal_id;
                console.log('✅ Journal created with ID:', journalId);
                
                console.log('\n💬 Testing message sending via API...');
                
                // Send a message via API (this should trigger Socket.IO broadcast)
                const response = await axios.post(`http://localhost:5000/api/journal/${journalId}/messages`, {
                  type: 'text',
                  content: 'Hello from Lynn! This is a test message.'
                }, {
                  headers: {
                    'Authorization': `Bearer ${user1Token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (response.data.success) {
                  console.log('✅ Message sent via API successfully');
                  testResults.messageSent = true;
                } else {
                  console.error('❌ Failed to send message via API:', response.data);
                  testResults.errors.push('API message send failed');
                }
              } else {
                console.error('❌ Failed to create journal:', journalResponse.data);
                testResults.errors.push('Journal creation failed');
              }
            } else {
              console.error('❌ Failed to create couple relationship:', coupleResponse.data);
              testResults.errors.push('Couple creation failed');
            }
          } catch (error) {
            console.error('❌ API error:', error.message);
            testResults.errors.push(`API: ${error.message}`);
          }
        }
      }, 2000);
    }
  }, 3000);
  
  // Test results after 10 seconds
  setTimeout(() => {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 REAL-TIME MESSAGING TEST RESULTS:');
    console.log('=' .repeat(60));
    console.log(`✅ Lynn Connected: ${testResults.lynnConnected ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Raj Connected: ${testResults.rajConnected ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Lynn Subscribed: ${testResults.lynnSubscribed ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Raj Subscribed: ${testResults.rajSubscribed ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Message Sent: ${testResults.messageSent ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Message Received: ${testResults.messageReceived ? 'PASS' : 'FAIL'}`);
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    const allPassed = testResults.lynnConnected && testResults.rajConnected && 
                     testResults.lynnSubscribed && testResults.rajSubscribed &&
                     testResults.messageSent && testResults.messageReceived && 
                     testResults.errors.length === 0;
    
    console.log('\n' + '=' .repeat(60));
    console.log(`🎯 OVERALL RESULT: ${allPassed ? '✅ REAL-TIME MESSAGING WORKS!' : '❌ REAL-TIME MESSAGING FAILED'}`);
    console.log('=' .repeat(60));
    
    lynnSocket.disconnect();
    rajSocket.disconnect();
    process.exit(allPassed ? 0 : 1);
  }, 10000);
}

// Run the test
testRealtimeMessaging().catch(console.error);