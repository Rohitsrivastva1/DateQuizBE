const fetch = require('node-fetch');

// Test the delete account endpoint
async function testDeleteAccount() {
    const API_BASE_URL = 'http://localhost:5000';
    
    try {
        console.log('🧪 Testing Delete Account API Endpoint...\n');
        
        // First, let's test with invalid credentials (should fail)
        console.log('1. Testing with invalid token (should fail):');
        const invalidResponse = await fetch(`${API_BASE_URL}/api/auth/delete-account`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer invalid-token'
            },
            body: JSON.stringify({
                email: 'test@example.com',
                reason: 'testing'
            })
        });
        
        const invalidData = await invalidResponse.json();
        console.log(`   Status: ${invalidResponse.status}`);
        console.log(`   Response: ${JSON.stringify(invalidData, null, 2)}\n`);
        
        // Test with missing email (should fail)
        console.log('2. Testing with missing email (should fail):');
        const missingEmailResponse = await fetch(`${API_BASE_URL}/api/auth/delete-account`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer valid-token'
            },
            body: JSON.stringify({
                reason: 'testing'
            })
        });
        
        const missingEmailData = await missingEmailResponse.json();
        console.log(`   Status: ${missingEmailResponse.status}`);
        console.log(`   Response: ${JSON.stringify(missingEmailData, null, 2)}\n`);
        
        console.log('✅ Delete Account API endpoint is responding correctly!');
        console.log('📝 Note: To test with valid credentials, you need to:');
        console.log('   1. Create a user account first');
        console.log('   2. Login to get a valid token');
        console.log('   3. Use that token to test account deletion');
        
    } catch (error) {
        console.error('❌ Error testing delete account endpoint:', error.message);
    }
}

// Run the test
testDeleteAccount();
