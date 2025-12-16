const { spawn } = require('child_process');
const path = require('path');

// Run all Socket.IO tests in sequence
async function runAllTests() {
  console.log('🧪 Running All Socket.IO Tests...');
  console.log('=' .repeat(80));
  
  const tests = [
    {
      name: 'Socket.IO Connection Test',
      file: 'test-socketio-connection.js',
      description: 'Tests basic Socket.IO connection and authentication'
    },
    {
      name: 'Real-Time Messaging Test',
      file: 'test-realtime-messaging.js',
      description: 'Tests real-time message broadcasting between users'
    },
    {
      name: 'Push Notifications Test',
      file: 'test-push-notifications.js',
      description: 'Tests push notification service for offline users'
    },
    {
      name: 'Complete Chat Flow Test',
      file: 'test-complete-chat-flow.js',
      description: 'Tests complete chat conversation with typing and reactions'
    }
  ];
  
  const results = [];
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n${i + 1}/${tests.length} Running: ${test.name}`);
    console.log(`📝 ${test.description}`);
    console.log('-'.repeat(60));
    
    try {
      const result = await runTest(test.file);
      results.push({
        name: test.name,
        passed: result === 0,
        exitCode: result
      });
      
      if (result === 0) {
        console.log(`✅ ${test.name} PASSED`);
      } else {
        console.log(`❌ ${test.name} FAILED (exit code: ${result})`);
      }
    } catch (error) {
      console.error(`❌ ${test.name} ERROR:`, error.message);
      results.push({
        name: test.name,
        passed: false,
        exitCode: -1,
        error: error.message
      });
    }
    
    // Wait a bit between tests
    if (i < tests.length - 1) {
      console.log('\n⏳ Waiting 3 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Final results
  console.log('\n' + '=' .repeat(80));
  console.log('📊 FINAL TEST RESULTS');
  console.log('=' .repeat(80));
  
  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${result.name}: ${status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  console.log('\n' + '=' .repeat(80));
  console.log(`🎯 SUMMARY: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Real-time messaging is working perfectly!');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed. Check the logs above for details.');
    process.exit(1);
  }
}

function runTest(testFile) {
  return new Promise((resolve, reject) => {
    const testPath = path.join(__dirname, testFile);
    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    child.on('close', (code) => {
      resolve(code);
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Run all tests
runAllTests().catch(console.error);
