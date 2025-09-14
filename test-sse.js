// test-sse.js
// Simple test script to verify SSE notifications

const fetch = require('node-fetch');

const BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://datequizbe.onrender.com' 
    : 'http://localhost:5000';

async function testSSE() {
    console.log('🧪 Testing SSE notifications...');
    console.log('Base URL:', BASE_URL);

    try {
        // Test 1: Send a test notification
        console.log('\n📤 Sending test notification...');
        const testResponse = await fetch(`${BASE_URL}/api/notifications/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'test_notification',
                data: {
                    message: 'This is a test notification',
                    userId: 123,
                    timestamp: new Date().toISOString()
                }
            })
        });

        const testResult = await testResponse.json();
        console.log('✅ Test notification result:', testResult);

        // Test 2: Check health endpoint
        console.log('\n🏥 Checking health endpoint...');
        const healthResponse = await fetch(`${BASE_URL}/health`);
        const healthResult = await healthResponse.json();
        console.log('✅ Health check result:', healthResult);

        console.log('\n🎉 SSE tests completed successfully!');
        console.log('\nTo test real-time notifications:');
        console.log('1. Open your app and connect to SSE');
        console.log('2. Run this script again to send notifications');
        console.log('3. Watch for real-time updates in your app');

    } catch (error) {
        console.error('❌ SSE test failed:', error.message);
        console.log('\nTroubleshooting:');
        console.log('1. Make sure your backend server is running');
        console.log('2. Check if the SSE endpoint is accessible');
        console.log('3. Verify CORS settings');
    }
}

// Run the test
testSSE();
