const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Test real-time messaging with existing partner accounts
async function testRealAccounts() {
  console.log('🧪 Testing Real-Time Messaging with Existing Partners...');
  console.log('=' .repeat(70));
  console.log('Using existing accounts: Rs (1234567) and Lynn (123456)');
  console.log('=' .repeat(70));
  
  // JWT secret from .env file
  const jwtSecret = 'your-super-secret-jwt-key-change-this-in-production-2024';
  
  let lynnToken, rsToken;
  let lynnUserId, rsUserId;
  
  try {
    // Login as Lynn
    console.log('\n🔐 Logging in as Lynn...');
    const lynnLogin = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'Lynn',
      password: '123456'
    });
    
    if (lynnLogin.data.token) {
      lynnToken = lynnLogin.data.token;
      lynnUserId = lynnLogin.data.user.id;
      console.log('✅ Lynn logged in successfully, User ID:', lynnUserId);
    } else {
      throw new Error('Lynn login failed: ' + (lynnLogin.data.message || 'No token received'));
    }
    
    // Login as Rs
    console.log('\n🔐 Logging in as Rs...');
    const rsLogin = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'Rs',
      password: '1234567'
    });
    
    if (rsLogin.data.token) {
      rsToken = rsLogin.data.token;
      rsUserId = rsLogin.data.user.id;
      console.log('✅ Rs logged in successfully, User ID:', rsUserId);
    } else {
      throw new Error('Rs login failed: ' + (rsLogin.data.message || 'No token received'));
    }
    
    // Check if they are partners
    console.log('\n👫 Checking partner status...');
    console.log('Lynn partner_id:', lynnLogin.data.user.partner_id);
    console.log('Rs partner_id:', rsLogin.data.user.partner_id);
    
    if (lynnLogin.data.user.partner_id === rsUserId && rsLogin.data.user.partner_id === lynnUserId) {
      console.log('✅ Lynn and Rs are partners!');
    } else {
      console.log('❌ Lynn and Rs are not partners');
      return;
    }
    
    // Create Socket.IO connections
    console.log('\n🔌 Creating Socket.IO connections...');
    
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
    
    let testResults = {
      lynnConnected: false,
      rsConnected: false,
      lynnSubscribed: false,
      rsSubscribed: false,
      messageSent: false,
      messageReceived: false,
      errors: []
    };
    
    // Lynn's event handlers
    lynnSocket.on('connect', () => {
      console.log('✅ Lynn connected to Socket.IO');
      testResults.lynnConnected = true;
    });
    
    lynnSocket.on('connected', (data) => {
      console.log('✅ Lynn authenticated:', data);
    });
    
    lynnSocket.on('journal_subscribed', (data) => {
      console.log('✅ Lynn subscribed to journal:', data.journalId);
      testResults.lynnSubscribed = true;
    });
    
    lynnSocket.on('new_message', (data) => {
      console.log('📨 Lynn received message:', data.data?.content);
      testResults.messageReceived = true;
    });
    
    lynnSocket.on('error', (error) => {
      console.error('❌ Lynn Socket.IO error:', error);
      testResults.errors.push(`Lynn: ${error}`);
    });
    
    // Rs's event handlers
    rsSocket.on('connect', () => {
      console.log('✅ Rs connected to Socket.IO');
      testResults.rsConnected = true;
    });
    
    rsSocket.on('connected', (data) => {
      console.log('✅ Rs authenticated:', data);
    });
    
    rsSocket.on('journal_subscribed', (data) => {
      console.log('✅ Rs subscribed to journal:', data.journalId);
      testResults.rsSubscribed = true;
    });
    
    rsSocket.on('new_message', (data) => {
      console.log('📨 Rs received message:', data.data?.content);
      testResults.messageReceived = true;
    });
    
    rsSocket.on('error', (error) => {
      console.error('❌ Rs Socket.IO error:', error);
      testResults.errors.push(`Rs: ${error}`);
    });
    
    // Wait for connections
    setTimeout(async () => {
      if (testResults.lynnConnected && testResults.rsConnected) {
        console.log('\n📝 Creating journal for today...');
        
        try {
          // Try to get existing journal for today first
          const today = new Date().toISOString().split('T')[0];
          console.log(`Getting journal for couple ID: ${rsUserId} (Rs's ID), date: ${today}`);
          
          let journalId;
          try {
            const getJournalResponse = await axios.get(`http://localhost:5000/api/journal/${rsUserId}/date/${today}`, {
              headers: {
                'Authorization': `Bearer ${lynnToken}`
              }
            });
            
            if (getJournalResponse.data.success && getJournalResponse.data.data.length > 0) {
              journalId = getJournalResponse.data.data[0].journal_id;
              console.log('✅ Found existing journal with ID:', journalId);
            } else {
              console.log('ℹ️ No existing journal found in response');
            }
          } catch (getError) {
            console.log('ℹ️ No existing journal found, creating new one...');
            
            // Create a journal for today using Rs's user ID as couple ID
            const journalResponse = await axios.post(`http://localhost:5000/api/journal/${rsUserId}/date/${today}`, {
              theme: 'Test Journal',
              isPrivate: false
            }, {
              headers: {
                'Authorization': `Bearer ${lynnToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (journalResponse.data.success) {
              journalId = journalResponse.data.data.journal_id;
              console.log('✅ Journal created with ID:', journalId);
            } else {
              throw new Error('Failed to create journal: ' + journalResponse.data.error);
            }
          }
          
          if (journalId) {
            // Subscribe both users to the journal
            console.log('\n📝 Subscribing to journal...');
            lynnSocket.emit('subscribe_journal', { journalId: journalId });
            rsSocket.emit('subscribe_journal', { journalId: journalId });
            
            setTimeout(async () => {
              if (testResults.lynnSubscribed && testResults.rsSubscribed) {
                console.log('\n💬 Testing message sending...');
                
                // Lynn sends a message
                const messageResponse = await axios.post(`http://localhost:5000/api/journal/${journalId}/messages`, {
                  type: 'text',
                  content: 'Hello Rs! This is a test message from Lynn. Can you see this in real-time?'
                }, {
                  headers: {
                    'Authorization': `Bearer ${lynnToken}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (messageResponse.data.success) {
                  console.log('✅ Message sent successfully');
                  testResults.messageSent = true;
                } else {
                  console.error('❌ Failed to send message:', messageResponse.data);
                  testResults.errors.push('Message send failed');
                }
              }
            }, 2000);
          } else {
            console.error('❌ Failed to create journal:', journalResponse.data);
            testResults.errors.push('Journal creation failed');
          }
        } catch (error) {
          console.error('❌ Error:', error.message);
          if (error.response) {
            console.error('❌ Error response:', error.response.data);
            console.error('❌ Error status:', error.response.status);
          }
          testResults.errors.push(`Error: ${error.message}`);
        }
      }
    }, 3000);
    
    // Test results after 15 seconds
    setTimeout(() => {
      console.log('\n' + '=' .repeat(70));
      console.log('📊 REAL-TIME MESSAGING TEST RESULTS:');
      console.log('=' .repeat(70));
      console.log(`✅ Lynn Connected: ${testResults.lynnConnected ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Rs Connected: ${testResults.rsConnected ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Lynn Subscribed: ${testResults.lynnSubscribed ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Rs Subscribed: ${testResults.rsSubscribed ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Message Sent: ${testResults.messageSent ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Message Received: ${testResults.messageReceived ? 'PASS' : 'FAIL'}`);
      
      if (testResults.errors.length > 0) {
        console.log('\n❌ ERRORS:');
        testResults.errors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
      }
      
      const allPassed = testResults.lynnConnected && testResults.rsConnected && 
                       testResults.lynnSubscribed && testResults.rsSubscribed &&
                       testResults.messageSent && testResults.messageReceived && 
                       testResults.errors.length === 0;
      
      console.log('\n' + '=' .repeat(70));
      console.log(`🎯 OVERALL RESULT: ${allPassed ? '✅ REAL-TIME MESSAGING WORKS!' : '❌ REAL-TIME MESSAGING FAILED'}`);
      console.log('=' .repeat(70));
      
      lynnSocket.disconnect();
      rsSocket.disconnect();
      process.exit(allPassed ? 0 : 1);
    }, 15000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testRealAccounts().catch(console.error);
