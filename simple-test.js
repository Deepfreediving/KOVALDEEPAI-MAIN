// Simple test for the unified API
const http = require('http');

console.log('🧪 Testing unified dive image upload API...');
console.log('🔧 Starting development server test...');

// Test the API endpoint exists
const testRequest = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/dive/upload-image',
  method: 'GET'
}, (res) => {
  console.log(`📡 Response status: ${res.statusCode}`);
  if (res.statusCode === 405) {
    console.log('✅ API endpoint exists (Method Not Allowed for GET is expected)');
  } else {
    console.log('⚠️ Unexpected response');
  }
});

testRequest.on('error', (err) => {
  console.log('❌ Server not running or API not accessible:', err.message);
});

testRequest.end();
