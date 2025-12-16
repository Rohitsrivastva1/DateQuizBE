const axios = require('axios');

// Test if server is running and Socket.IO is available
async function testServerStatus() {
  console.log('🧪 Testing Server Status...');
  console.log('=' .repeat(50));
  
  try {
    // Test basic server health
    console.log('1️⃣ Testing server health...');
    const healthResponse = await axios.get('http://localhost:5000/health', { timeout: 5000 });
    console.log('✅ Server is running');
    console.log('   Status:', healthResponse.status);
    console.log('   Response:', healthResponse.data);
    
    // Test Socket.IO endpoint
    console.log('\n2️⃣ Testing Socket.IO endpoint...');
    try {
      const socketResponse = await axios.get('http://localhost:5000/socket.io/', { timeout: 5000 });
      console.log('✅ Socket.IO endpoint is accessible');
      console.log('   Status:', socketResponse.status);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Socket.IO endpoint is accessible (400 is expected for GET without proper headers)');
      } else {
        console.log('❌ Socket.IO endpoint error:', error.message);
        return false;
      }
    }
    
    // Test if Socket.IO service is initialized
    console.log('\n3️⃣ Testing Socket.IO service initialization...');
    try {
      const wsInfoResponse = await axios.get('http://localhost:5000/ws-info', { timeout: 5000 });
      console.log('✅ WebSocket info endpoint accessible');
      console.log('   Response:', wsInfoResponse.data);
    } catch (error) {
      console.log('⚠️ WebSocket info endpoint not available (this is expected with Socket.IO)');
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎯 SERVER STATUS: ✅ READY FOR TESTING');
    console.log('=' .repeat(50));
    return true;
    
  } catch (error) {
    console.log('\n' + '=' .repeat(50));
    console.log('❌ SERVER STATUS: NOT READY');
    console.log('=' .repeat(50));
    console.log('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Solution: Start the server with: node server.js');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n💡 Solution: Server might be starting up, wait a moment and try again');
    }
    
    return false;
  }
}

// Run the test
testServerStatus().then(success => {
  process.exit(success ? 0 : 1);
}).catch(console.error);
