const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Complete test with detailed logging
function testCompleteFlow() {
  console.log('🧪 Complete Socket.IO Flow Test...');
  console.log('=' .repeat(60));
  
  // Create test JWT token
  const jwtSecret = 'your-super-secret-jwt-key-change-in-production';
  const testToken = jwt.sign(
    { id: 1, username: 'testuser' }, 
    jwtSecret
  );
  
  console.log('🔑 Token created:', testToken.substring(0, 30) + '...');
  console.log('🔑 Token length:', testToken.length);
  
  // Test different connection methods
  console.log('\n1️⃣ Testing with auth only...');
  const socket1 = io('http://localhost:5000', {
    auth: { token: testToken },
    transports: ['polling'],
    timeout: 5000,
    reconnection: false
  });
  
  socket1.on('connect', () => {
    console.log('✅ Socket 1 connected!');
    socket1.disconnect();
  });
  
  socket1.on('connect_error', (error) => {
    console.log('❌ Socket 1 error:', error.message);
  });
  
  setTimeout(() => {
    console.log('\n2️⃣ Testing with query only...');
    const socket2 = io('http://localhost:5000', {
      query: { token: testToken },
      transports: ['polling'],
      timeout: 5000,
      reconnection: false
    });
    
    socket2.on('connect', () => {
      console.log('✅ Socket 2 connected!');
      socket2.disconnect();
    });
    
    socket2.on('connect_error', (error) => {
      console.log('❌ Socket 2 error:', error.message);
    });
    
    setTimeout(() => {
      console.log('\n3️⃣ Testing with both auth and query...');
      const socket3 = io('http://localhost:5000', {
        auth: { token: testToken },
        query: { token: testToken },
        transports: ['polling'],
        timeout: 5000,
        reconnection: false
      });
      
      socket3.on('connect', () => {
        console.log('✅ Socket 3 connected!');
        socket3.disconnect();
      });
      
      socket3.on('connect_error', (error) => {
        console.log('❌ Socket 3 error:', error.message);
      });
      
      setTimeout(() => {
        console.log('\n4️⃣ Testing with websocket transport...');
        const socket4 = io('http://localhost:5000', {
          auth: { token: testToken },
          query: { token: testToken },
          transports: ['websocket'],
          timeout: 5000,
          reconnection: false
        });
        
        socket4.on('connect', () => {
          console.log('✅ Socket 4 connected!');
          socket4.disconnect();
        });
        
        socket4.on('connect_error', (error) => {
          console.log('❌ Socket 4 error:', error.message);
        });
        
        setTimeout(() => {
          console.log('\n' + '=' .repeat(60));
          console.log('🎯 Test completed - check server logs for authentication attempts');
          console.log('=' .repeat(60));
          process.exit(0);
        }, 5000);
      }, 2000);
    }, 2000);
  }, 2000);
}

testCompleteFlow();
