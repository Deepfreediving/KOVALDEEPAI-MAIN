const fs = require('fs');
const path = require('path');

// 🔧 UNIFIED UPLOAD API TEST SCRIPT
// Tests both base64 and file uploads to the new unified endpoint
console.log('🧪 Testing UNIFIED Dive Image Upload & Analysis API...\n');

// Test configuration
const API_BASE = 'http://localhost:3000'; // Change to your actual API base URL
const TEST_USER_ID = 'test-user-123';
const TEST_DIVE_LOG_ID = 'dive-456';

// Sample base64 image (1x1 pixel transparent PNG)
const SAMPLE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHIff6RWgAAAABJRU5ErkJggg==';

// Test 1: Base64 Upload
async function testBase64Upload() {
  console.log('📝 Test 1: Base64 Upload');
  console.log('========================');
  
  try {
    const payload = {
      imageData: SAMPLE_BASE64,
      userId: TEST_USER_ID,
      diveLogId: TEST_DIVE_LOG_ID,
      filename: 'test-base64-image.png'
    };

    console.log('📤 Sending base64 upload request...');
    console.log(`   User ID: ${TEST_USER_ID}`);
    console.log(`   Dive Log ID: ${TEST_DIVE_LOG_ID}`);
    console.log(`   Data size: ${SAMPLE_BASE64.length} chars`);
    
    const response = await fetch(`${API_BASE}/api/dive/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Base64 upload successful!');
      console.log(`   Image ID: ${result.data?.imageId}`);
      console.log(`   Image URL: ${result.data?.imageUrl}`);
      console.log(`   Confidence: ${result.data?.confidence}`);
      console.log(`   Metrics extracted: ${Object.keys(result.data?.extractedMetrics || {}).length}`);
      console.log(`   Processing method: ${result.data?.processingMethod}`);
      return true;
    } else {
      console.log('❌ Base64 upload failed:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${result.error}`);
      console.log(`   Details: ${result.details || 'N/A'}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Base64 upload error:', error.message);
    return false;
  }
}

// Test 2: Multipart File Upload (simulated)
async function testFileUpload() {
  console.log('\n📁 Test 2: File Upload (Simulated)');
  console.log('===================================');
  
  try {
    // Create a simple test file buffer
    const testBuffer = Buffer.from('fake-image-data-for-testing');
    
    // Create FormData equivalent for Node.js
    const FormData = require('form-data');
    const form = new FormData();
    
    form.append('userId', TEST_USER_ID);
    form.append('diveLogId', TEST_DIVE_LOG_ID);
    form.append('image', testBuffer, {
      filename: 'test-file-upload.jpg',
      contentType: 'image/jpeg'
    });

    console.log('📤 Sending file upload request...');
    console.log(`   User ID: ${TEST_USER_ID}`);
    console.log(`   Dive Log ID: ${TEST_DIVE_LOG_ID}`);
    console.log(`   File size: ${testBuffer.length} bytes`);
    
    const response = await fetch(`${API_BASE}/api/dive/upload-image`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ File upload successful!');
      console.log(`   Image ID: ${result.data?.imageId}`);
      console.log(`   Image URL: ${result.data?.imageUrl}`);
      console.log(`   Confidence: ${result.data?.confidence}`);
      console.log(`   Metrics extracted: ${Object.keys(result.data?.extractedMetrics || {}).length}`);
      console.log(`   Processing method: ${result.data?.processingMethod}`);
      return true;
    } else {
      console.log('❌ File upload failed:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${result.error}`);
      console.log(`   Details: ${result.details || 'N/A'}`);
      return false;
    }
  } catch (error) {
    console.log('❌ File upload error:', error.message);
    return false;
  }
}

// Test 3: Error Handling
async function testErrorHandling() {
  console.log('\n⚠️  Test 3: Error Handling');
  console.log('==========================');
  
  const tests = [
    {
      name: 'Missing userId',
      payload: { imageData: SAMPLE_BASE64 },
      expectedStatus: 400
    },
    {
      name: 'Missing imageData',
      payload: { userId: TEST_USER_ID },
      expectedStatus: 400
    },
    {
      name: 'Invalid method (GET)',
      method: 'GET',
      expectedStatus: 405
    }
  ];

  let passedTests = 0;
  
  for (const test of tests) {
    try {
      console.log(`   Testing: ${test.name}`);
      
      const response = await fetch(`${API_BASE}/api/dive/upload-image`, {
        method: test.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: test.payload ? JSON.stringify(test.payload) : undefined
      });

      if (response.status === test.expectedStatus) {
        console.log(`     ✅ Correctly returned ${response.status}`);
        passedTests++;
      } else {
        console.log(`     ❌ Expected ${test.expectedStatus}, got ${response.status}`);
      }
    } catch (error) {
      console.log(`     ❌ Error: ${error.message}`);
    }
  }
  
  return passedTests === tests.length;
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting UNIFIED Upload API Tests\n');
  
  const results = {
    base64: false,
    file: false,
    errors: false
  };
  
  // Only run tests if server is available
  try {
    const healthCheck = await fetch(`${API_BASE}/api/health`).catch(() => null);
    if (!healthCheck) {
      console.log('⚠️  Warning: Server not running at', API_BASE);
      console.log('   These tests require the Next.js dev server to be running.');
      console.log('   Run: npm run dev');
      console.log('\n📋 Test Structure Verification (Static Analysis)');
      console.log('================================================');
      
      // Check if API file exists and is properly structured
      const apiPath = path.join(__dirname, 'apps/web/pages/api/dive/upload-image.js');
      if (fs.existsSync(apiPath)) {
        const content = fs.readFileSync(apiPath, 'utf8');
        console.log('✅ API file exists');
        console.log('✅ Export structure:', content.includes('export default') ? 'Valid' : 'Invalid');
        console.log('✅ Required imports:', content.includes('formidable') && content.includes('OpenAI') ? 'Present' : 'Missing');
        console.log('✅ Handler function:', content.includes('async function handler') ? 'Present' : 'Missing');
      } else {
        console.log('❌ API file missing at:', apiPath);
      }
      return;
    }
  } catch (error) {
    console.log('⚠️  Could not verify server status:', error.message);
  }

  // Run all tests
  results.base64 = await testBase64Upload();
  results.file = await testFileUpload();
  results.errors = await testErrorHandling();
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`Base64 Upload: ${results.base64 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`File Upload: ${results.file ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Error Handling: ${results.errors ? '✅ PASS' : '❌ FAIL'}`);
  
  const totalPassed = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${totalPassed}/${totalTests} tests passed`);
  
  if (totalPassed === totalTests) {
    console.log('🎉 All tests passed! The unified upload API is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
  }
}

// Install required dependencies if missing
async function checkDependencies() {
  try {
    require('form-data');
  } catch (error) {
    console.log('📦 Installing required dependency: form-data');
    const { execSync } = require('child_process');
    execSync('npm install form-data', { stdio: 'inherit' });
  }
  
  try {
    require('node-fetch');
    global.fetch = require('node-fetch');
  } catch (error) {
    console.log('📦 Installing required dependency: node-fetch');
    const { execSync } = require('child_process');
    execSync('npm install node-fetch@2', { stdio: 'inherit' });
    global.fetch = require('node-fetch');
  }
}

// Run the tests
(async () => {
  try {
    await checkDependencies();
    await runTests();
  } catch (error) {
    console.error('❌ Test runner error:', error);
  }
})();
