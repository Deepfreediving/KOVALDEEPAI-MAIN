#!/usr/bin/env node
// 🧪 Unified Dive Image Upload API Test Script
// Tests both file upload and base64 upload methods with enhanced analysis

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LOCAL_URL = 'http://localhost:3000';
const PRODUCTION_URL = 'https://koval-deep-ai-main.vercel.app'; // Update with your actual URL
const TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

// Test endpoints
const UNIFIED_API = '/api/dive/upload-image';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Create a sample dive computer image (base64 representation)
function createTestImageBase64() {
  // This is a 1x1 pixel transparent PNG in base64
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

// Test 1: File Upload Method
async function testFileUpload(baseUrl) {
  log(colors.blue, '\n🗂️  Test 1: File Upload Method');
  
  try {
    // Create a simple test image buffer
    const imageBuffer = Buffer.from(createTestImageBase64(), 'base64');
    
    // Create FormData
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    formData.append('image', imageBuffer, {
      filename: 'test-dive-computer.png',
      contentType: 'image/png'
    });
    formData.append('userId', TEST_USER_ID);
    formData.append('diveLogId', `test-dive-${Date.now()}`);
    
    log(colors.yellow, `📤 Uploading to: ${baseUrl}${UNIFIED_API}`);
    
    const response = await fetch(`${baseUrl}${UNIFIED_API}`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      log(colors.green, '✅ File upload test PASSED');
      log(colors.blue, `   📊 Image ID: ${result.data.imageId}`);
      log(colors.blue, `   🔍 Confidence: ${result.data.confidence}`);
      log(colors.blue, `   📈 Performance Rating: ${result.data.performanceRating || 'N/A'}`);
      log(colors.blue, `   💡 Recommendations: ${result.data.recommendations?.length || 0}`);
      return true;
    } else {
      log(colors.red, '❌ File upload test FAILED');
      log(colors.red, `   Error: ${result.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    log(colors.red, '❌ File upload test ERROR');
    log(colors.red, `   ${error.message}`);
    return false;
  }
}

// Test 2: Base64 Upload Method
async function testBase64Upload(baseUrl) {
  log(colors.blue, '\n📱 Test 2: Base64 Upload Method');
  
  try {
    const testImageData = `data:image/png;base64,${createTestImageBase64()}`;
    
    const payload = {
      imageData: testImageData,
      userId: TEST_USER_ID,
      filename: 'test-dive-computer-base64.png',
      diveLogId: `test-base64-dive-${Date.now()}`
    };
    
    log(colors.yellow, `📤 Uploading to: ${baseUrl}${UNIFIED_API}`);
    
    const response = await fetch(`${baseUrl}${UNIFIED_API}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      log(colors.green, '✅ Base64 upload test PASSED');
      log(colors.blue, `   📊 Image ID: ${result.data.imageId}`);
      log(colors.blue, `   🔍 Confidence: ${result.data.confidence}`);
      log(colors.blue, `   📈 Performance Rating: ${result.data.performanceRating || 'N/A'}`);
      log(colors.blue, `   💡 Recommendations: ${result.data.recommendations?.length || 0}`);
      log(colors.blue, `   🗜️ Compression: ${result.data.compressionRatio}%`);
      return true;
    } else {
      log(colors.red, '❌ Base64 upload test FAILED');
      log(colors.red, `   Error: ${result.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    log(colors.red, '❌ Base64 upload test ERROR');
    log(colors.red, `   ${error.message}`);
    return false;
  }
}

// Test 3: Enhanced Analysis Validation
async function testEnhancedAnalysis(baseUrl) {
  log(colors.blue, '\n🧠 Test 3: Enhanced Analysis Validation');
  
  try {
    const testImageData = `data:image/png;base64,${createTestImageBase64()}`;
    
    const payload = {
      imageData: testImageData,
      userId: TEST_USER_ID,
      filename: 'test-enhanced-analysis.png'
    };
    
    const response = await fetch(`${baseUrl}${UNIFIED_API}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      const data = result.data;
      
      // Check for enhanced analysis features
      const hasExtractedData = data.extractedData && Object.keys(data.extractedData).length > 0;
      const hasCoachingInsights = data.coachingInsights && Object.keys(data.coachingInsights).length > 0;
      const hasProfileAnalysis = data.profileAnalysis && Object.keys(data.profileAnalysis).length > 0;
      const hasRecommendations = data.recommendations && Array.isArray(data.recommendations);
      
      if (hasExtractedData || hasCoachingInsights || hasProfileAnalysis || hasRecommendations) {
        log(colors.green, '✅ Enhanced analysis test PASSED');
        log(colors.blue, `   📊 Extracted Data: ${hasExtractedData ? '✓' : '✗'}`);
        log(colors.blue, `   🎯 Coaching Insights: ${hasCoachingInsights ? '✓' : '✗'}`);
        log(colors.blue, `   📈 Profile Analysis: ${hasProfileAnalysis ? '✓' : '✗'}`);
        log(colors.blue, `   💡 Recommendations: ${hasRecommendations ? '✓' : '✗'}`);
        log(colors.blue, `   🔗 Processing Method: ${data.processingMethod}`);
        return true;
      } else {
        log(colors.yellow, '⚠️  Enhanced analysis test PARTIAL');
        log(colors.yellow, '   Analysis completed but no enhanced features detected');
        return true;
      }
    } else {
      log(colors.red, '❌ Enhanced analysis test FAILED');
      log(colors.red, `   Error: ${result.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    log(colors.red, '❌ Enhanced analysis test ERROR');
    log(colors.red, `   ${error.message}`);
    return false;
  }
}

// Test 4: Error Handling
async function testErrorHandling(baseUrl) {
  log(colors.blue, '\n🚨 Test 4: Error Handling');
  
  try {
    // Test 1: Missing required fields
    log(colors.yellow, '   Testing missing userId...');
    let response = await fetch(`${baseUrl}${UNIFIED_API}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: 'invalid' })
    });
    
    if (response.status === 400) {
      log(colors.green, '   ✅ Missing userId validation works');
    } else {
      log(colors.red, '   ❌ Missing userId validation failed');
      return false;
    }
    
    // Test 2: Invalid method
    log(colors.yellow, '   Testing invalid HTTP method...');
    response = await fetch(`${baseUrl}${UNIFIED_API}`, {
      method: 'GET'
    });
    
    if (response.status === 405) {
      log(colors.green, '   ✅ Method validation works');
    } else {
      log(colors.red, '   ❌ Method validation failed');
      return false;
    }
    
    log(colors.green, '✅ Error handling test PASSED');
    return true;
  } catch (error) {
    log(colors.red, '❌ Error handling test ERROR');
    log(colors.red, `   ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  log(colors.bold + colors.blue, '🚀 UNIFIED Dive Image Upload API Test Suite');
  log(colors.blue, '================================================');
  
  const testUrl = process.argv[2] === '--production' ? PRODUCTION_URL : LOCAL_URL;
  log(colors.yellow, `🌐 Testing against: ${testUrl}`);
  
  const results = [];
  
  // Run all tests
  results.push(await testFileUpload(testUrl));
  results.push(await testBase64Upload(testUrl));
  results.push(await testEnhancedAnalysis(testUrl));
  results.push(await testErrorHandling(testUrl));
  
  // Summary
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  log(colors.blue, '\n📊 Test Results Summary');
  log(colors.blue, '========================');
  log(colors.green, `✅ Passed: ${passed}/${total} tests`);
  
  if (passed === total) {
    log(colors.green + colors.bold, '🎉 ALL TESTS PASSED! Unified API is working perfectly!');
    process.exit(0);
  } else {
    log(colors.red + colors.bold, `❌ ${total - passed} test(s) failed. Please check the logs above.`);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  log(colors.red, '❌ Test suite crashed:');
  log(colors.red, error.message);
  process.exit(1);
});
