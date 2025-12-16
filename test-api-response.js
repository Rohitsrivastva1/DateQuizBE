const http = require('http');

// Test the partner status endpoint
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/partner/status',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:');
    console.log(data);
    console.log('Response length:', data.length);
    
    // Try to parse as JSON
    try {
      const json = JSON.parse(data);
      console.log('Parsed JSON:', json);
    } catch (e) {
      console.log('Not valid JSON:', e.message);
      console.log('First 100 chars:', data.substring(0, 100));
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();

