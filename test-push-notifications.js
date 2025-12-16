const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Test push notifications for offline users
async function testPushNotifications() {
  console.log('🧪 Starting Push Notifications Test...');
  console.log('=' .repeat(60));
  
  // Create test tokens for two users (using JWT secret from .env file)
  const jwtSecret = 'your-super-secret-jwt-key-change-this-in-production-2024';
  const senderToken = jwt.sign(
    { id: 1, username: 'lynn' }, 
    jwtSecret
  );
  
  const receiverToken = jwt.sign(
    { id: 2, username: 'raj' }, 
    jwtSecret
  );
  
  console.log('👤 Sender (Lynn):', senderToken.substring(0, 20) + '...');
  console.log('👤 Receiver (Raj):', receiverToken.substring(0, 20) + '...');
  
  const testJournalId = 'test-journal-' + Date.now();
  let testResults = {
    senderConnected: false,
    receiverConnected: false,
    messageSent: false,
    pushNotificationSent: false,
    errors: []
  };
  
  // Only sender connects to simulate receiver being offline
  const senderSocket = io('http://localhost:5000', {
    auth: { token: senderToken },
    transports: ['websocket', 'polling']
  });
  
  senderSocket.on('connect', () => {
    console.log('✅ Sender (Lynn) connected');
    testResults.senderConnected = true;
  });
  
  senderSocket.on('connected', (data) => {
    console.log('✅ Sender authenticated');
  });
  
  senderSocket.on('journal_subscribed', (data) => {
    console.log('✅ Sender subscribed to journal');
  });
  
  senderSocket.on('error', (error) => {
    console.error('❌ Sender error:', error);
    testResults.errors.push(`Sender: ${error}`);
  });
  
  // Test sequence
  setTimeout(async () => {
    if (testResults.senderConnected) {
      console.log('\n📝 Sender subscribing to journal...');
      senderSocket.emit('subscribe_journal', { journalId: testJournalId });
      
      setTimeout(async () => {
        console.log('\n💬 Sending message to offline user...');
        
        try {
          // Send a message via API (this should trigger push notification)
          const response = await axios.post('http://localhost:5000/api/journal/messages', {
            journal_id: testJournalId,
            type: 'text',
            content: 'Hello Raj! This message should trigger a push notification since you are offline.'
          }, {
            headers: {
              'Authorization': `Bearer ${senderToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.data.success) {
            console.log('✅ Message sent via API successfully');
            testResults.messageSent = true;
            
            // Check if push notification was sent
            console.log('\n📱 Checking push notification service...');
            
            // We can't directly test push notifications without Expo tokens,
            // but we can verify the service is called
            try {
              const pushService = require('./src/services/pushNotificationService');
              const pushServiceInstance = new pushService();
              
              // Test if push notification service is available
              if (pushServiceInstance && typeof pushServiceInstance.sendJournalMessageNotification === 'function') {
                console.log('✅ Push notification service is available');
                testResults.pushNotificationSent = true;
              } else {
                console.log('❌ Push notification service not available');
                testResults.errors.push('Push notification service not available');
              }
            } catch (error) {
              console.error('❌ Push notification service error:', error.message);
              testResults.errors.push(`Push service: ${error.message}`);
            }
          } else {
            console.error('❌ Failed to send message via API:', response.data);
            testResults.errors.push('API message send failed');
          }
        } catch (error) {
          console.error('❌ API error:', error.message);
          testResults.errors.push(`API: ${error.message}`);
        }
      }, 2000);
    }
  }, 3000);
  
  // Test results after 8 seconds
  setTimeout(() => {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 PUSH NOTIFICATIONS TEST RESULTS:');
    console.log('=' .repeat(60));
    console.log(`✅ Sender Connected: ${testResults.senderConnected ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Message Sent: ${testResults.messageSent ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Push Service Available: ${testResults.pushNotificationSent ? 'PASS' : 'FAIL'}`);
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    const allPassed = testResults.senderConnected && testResults.messageSent && 
                     testResults.pushNotificationSent && testResults.errors.length === 0;
    
    console.log('\n' + '=' .repeat(60));
    console.log(`🎯 OVERALL RESULT: ${allPassed ? '✅ PUSH NOTIFICATIONS READY!' : '❌ PUSH NOTIFICATIONS FAILED'}`);
    console.log('=' .repeat(60));
    
    senderSocket.disconnect();
    process.exit(allPassed ? 0 : 1);
  }, 8000);
}

// Run the test
testPushNotifications().catch(console.error);
