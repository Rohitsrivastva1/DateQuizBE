const WebSocket = require('ws');

// Test WebSocket connection
function testWebSocket() {
  const ws = new WebSocket('ws://localhost:5000/ws?protocol=journal-chat');
  
  ws.on('open', () => {
    console.log('✅ WebSocket connected');
    
    // Test authentication
    ws.send(JSON.stringify({
      type: 'auth',
      token: 'test-token' // This will fail but we can see the connection works
    }));
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📨 Received message:', message);
  });
  
  ws.on('close', (code, reason) => {
    console.log('❌ WebSocket closed:', code, reason.toString());
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
  
  // Test subscription
  setTimeout(() => {
    console.log('📝 Testing journal subscription...');
    ws.send(JSON.stringify({
      type: 'subscribe_journal',
      journalId: 'test-journal-123'
    }));
  }, 2000);
  
  // Test message sending
  setTimeout(() => {
    console.log('💬 Testing chat message...');
    ws.send(JSON.stringify({
      type: 'chat_message',
      roomId: 'test-room',
      content: 'Hello from test client!'
    }));
  }, 4000);
  
  // Close after test
  setTimeout(() => {
    console.log('🔌 Closing test connection...');
    ws.close();
  }, 6000);
}

console.log('🧪 Starting WebSocket test...');
testWebSocket();
