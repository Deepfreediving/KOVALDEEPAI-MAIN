#!/usr/bin/env node

/**
 * Test script to verify image upload and AI analysis
 * Tests both local and production endpoints
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

// Test image path - you can create a test image or use any existing one
const TEST_IMAGE_PATH = './public/test-dive-profile.jpg';

async function testImageAnalysis(baseUrl, description) {
  console.log(`\n🧪 Testing ${description}: ${baseUrl}`);
  console.log('='.repeat(60));

  try {
    // Check if test image exists
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.log(`⚠️  Test image not found at ${TEST_IMAGE_PATH}`);
      console.log('📝 Creating a dummy test file...');
      
      // Create a minimal test file for the upload (not a real image, but tests the API)
      fs.writeFileSync(TEST_IMAGE_PATH, 'dummy test file content for API testing');
    }

    const formData = new FormData();
    formData.append('image', fs.createReadStream(TEST_IMAGE_PATH));
    formData.append('diveLogId', `test-dive-${Date.now()}`);

    console.log('📤 Uploading test image...');
    
    const response = await fetch(`${baseUrl}/api/openai/upload-dive-image`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
    console.log('📝 Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📥 Response Body:');
    console.log(responseText);

    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('\n✅ SUCCESS: Image analysis completed');
        
        if (result.data) {
          console.log('\n📊 Analysis Results:');
          console.log('  OCR Success:', result.data.ocr?.success || false);
          console.log('  OCR Text:', result.data.ocr?.text || 'None detected');
          console.log('  Technical Analysis:', !!result.data.technical);
          console.log('  Vision Analysis:', !!result.data.vision);
          
          if (result.data.vision?.insights) {
            console.log('\n🤖 AI Vision Insights:');
            console.log(result.data.vision.insights.substring(0, 200) + '...');
          }
        }
      } catch (parseError) {
        console.log('⚠️  Response is not valid JSON');
      }
    } else {
      console.log('\n❌ FAILED: Image upload/analysis failed');
      
      try {
        const errorResult = JSON.parse(responseText);
        console.log('Error Details:', errorResult);
      } catch {
        console.log('Raw Error Response:', responseText);
      }
    }

  } catch (error) {
    console.log('\n💥 REQUEST FAILED:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   Connection refused - server may not be running');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   DNS resolution failed - check URL');
    }
  }
}

async function testImageEndpoints() {
  console.log('🎯 IMAGE UPLOAD & AI ANALYSIS TEST');
  console.log('==================================');
  
  // Test local development server
  await testImageAnalysis('http://localhost:3000', 'Local Development');
  
  // Test production
  await testImageAnalysis('https://koval-deep-ai.vercel.app', 'Production (Vercel)');
  
  // Cleanup test file if we created it
  if (fs.existsSync(TEST_IMAGE_PATH) && fs.readFileSync(TEST_IMAGE_PATH, 'utf8') === 'dummy test file content for API testing') {
    fs.unlinkSync(TEST_IMAGE_PATH);
    console.log('\n🧹 Cleaned up test file');
  }
  
  console.log('\n✨ Test complete!');
}

// Run the test
testImageEndpoints().catch(console.error);
