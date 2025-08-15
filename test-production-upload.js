#!/usr/bin/env node

/**
 * Production Image Upload Test
 * Tests the live site's image upload API
 */

const https = require('https');
const fs = require('fs');

// Create a minimal test image (1x1 pixel PNG)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA60e6kgAAAABJRU5ErkJggg==';
const testImageBuffer = Buffer.from(testImageBase64, 'base64');

async function testProductionUpload() {
  console.log('🧪 TESTING PRODUCTION IMAGE UPLOAD API');
  console.log('=====================================');
  
  // Create boundary for multipart form data
  const boundary = '----formdata-test-' + Math.random().toString(36);
  
  // Build multipart form data
  const formData = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="diveLogId"',
    '',
    `test-${Date.now()}`,
    `--${boundary}`,
    'Content-Disposition: form-data; name="userId"',
    '',
    'test-user',
    `--${boundary}`,
    'Content-Disposition: form-data; name="image"; filename="test.png"',
    'Content-Type: image/png',
    '',
    testImageBuffer.toString('binary'),
    `--${boundary}--`,
    ''
  ].join('\r\n');
  
  const postData = Buffer.from(formData, 'binary');
  
  const options = {
    hostname: 'koval-deep-ai.vercel.app',
    path: '/api/openai/upload-dive-image',
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': postData.length,
      'User-Agent': 'Test-Script/1.0'
    }
  };
  
  return new Promise((resolve, reject) => {
    console.log('📤 Sending test image to production API...');
    console.log(`🔗 URL: https://${options.hostname}${options.path}`);
    
    const req = https.request(options, (res) => {
      console.log(`📡 Response Status: ${res.statusCode} ${res.statusMessage}`);
      console.log('📋 Response Headers:', res.headers);
      
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        console.log('\n📥 Response Body:');
        console.log(responseBody);
        
        try {
          const parsed = JSON.parse(responseBody);
          console.log('\n✅ SUCCESS: API Response Parsed');
          console.log('📊 Result:', {
            success: parsed.success,
            hasData: !!parsed.data,
            hasOCR: !!parsed.data?.ocr,
            hasVision: !!parsed.data?.vision,
            hasImage: !!parsed.data?.imageUrl,
            message: parsed.message?.substring(0, 100) + '...'
          });
          
          if (parsed.data?.vision?.insights) {
            console.log('\n🤖 AI Vision Analysis Preview:');
            console.log(parsed.data.vision.insights.substring(0, 200) + '...');
          }
          
          resolve(parsed);
        } catch (e) {
          console.log('\n⚠️  Response is not JSON, raw response:');
          console.log(responseBody.substring(0, 500));
          resolve({ raw: responseBody });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('\n❌ REQUEST FAILED:', error.message);
      
      if (error.code === 'ENOTFOUND') {
        console.log('   DNS resolution failed - check URL');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   Connection refused - server may be down');
      }
      
      reject(error);
    });
    
    req.on('timeout', () => {
      console.log('\n⏰ REQUEST TIMED OUT');
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.setTimeout(30000); // 30 second timeout
    req.write(postData);
    req.end();
  });
}

// Run the test
testProductionUpload()
  .then((result) => {
    console.log('\n🎯 TEST COMPLETED');
    if (result.success) {
      console.log('✅ Image upload and AI analysis working correctly!');
    } else {
      console.log('❌ Issues found - check logs above');
    }
  })
  .catch((error) => {
    console.log('\n💥 TEST FAILED:', error.message);
    process.exit(1);
  });
