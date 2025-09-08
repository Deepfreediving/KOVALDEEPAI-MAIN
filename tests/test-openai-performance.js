#!/usr/bin/env node

// 🧪 TEST: OpenAI Vision API Performance - Why 23 seconds?
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = '35b522f1-27d2-49de-ed2b-0d257d33ad7d';

// Create different sized test images to test performance
function createTestImages() {
  // Tiny 1x1 pixel PNG (minimal data)
  const tinyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  
  // Small test image with some text
  const smallSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
    <rect width="100%" height="100%" fill="black"/>
    <text x="50%" y="50%" fill="white" text-anchor="middle" font-size="20">MAX DEPTH: 50m</text>
  </svg>`;
  const smallImage = 'data:image/svg+xml;base64,' + Buffer.from(smallSVG).toString('base64');
  
  // Larger realistic dive computer display
  const largeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
    <rect width="100%" height="100%" fill="#000"/>
    <text x="50" y="50" fill="#0ff" font-size="24">DIVE COMPUTER</text>
    <text x="50" y="100" fill="#ff0" font-size="32">MAX DEPTH: 103.6m</text>
    <text x="50" y="150" fill="#ff0" font-size="24">TIME: 03:45</text>
    <text x="50" y="200" fill="#ff0" font-size="20">TEMP: 23°C</text>
    <rect x="50" y="250" width="700" height="300" fill="#001" stroke="#0ff"/>
    <polyline points="60,400 150,350 250,300 350,250 450,300 550,350 650,400" 
              stroke="#0f0" stroke-width="3" fill="none"/>
  </svg>`;
  const largeImage = 'data:image/svg+xml;base64,' + Buffer.from(largeSVG).toString('base64');
  
  return { tinyImage, smallImage, largeImage };
}

async function testImageProcessingSpeed(imageName, imageData) {
  console.log(`\n🧪 Testing ${imageName}...`);
  console.log('Image size:', imageData.length, 'characters');
  
  const startTime = Date.now();
  
  try {
    const payload = {
      imageData: imageData,
      userId: TEST_USER_ID,
      filename: `test-${imageName}.png`,
      diveLogId: null // Don't link to a dive log for speed test
    };
    
    console.log('📤 Sending request...');
    const response = await fetch(`${BASE_URL}/api/dive/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`⏱️  Total time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    console.log('📥 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS');
      console.log('🤖 Tokens used:', result.data?.tokensUsed || 'Unknown');
      console.log('🎯 Confidence:', result.data?.confidence || 'Unknown');
      
      // Look for timing data in response
      if (result.data?.timing) {
        console.log('⏰ Detailed timing:', result.data.timing);
      }
      
      return { success: true, time: totalTime, tokens: result.data?.tokensUsed };
    } else {
      const errorText = await response.text();
      console.log('❌ FAILED:', errorText.substring(0, 100));
      return { success: false, time: totalTime, error: errorText };
    }
    
  } catch (error) {
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    console.log(`❌ ERROR after ${totalTime}ms:`, error.message);
    return { success: false, time: totalTime, error: error.message };
  }
}

async function testPromptComplexity() {
  console.log('\n🧪 Testing if prompt length affects speed...');
  
  // Test with a simple image but check if we can add a prompt parameter
  const { smallImage } = createTestImages();
  
  // We'd need to modify the API to accept a "simple" flag, but since you don't want changes,
  // let's just note this for investigation
  console.log('📝 Note: The API uses a very long, detailed prompt');
  console.log('📝 This could be causing the 23-second processing time');
  console.log('📝 A shorter prompt might process in 2-3 seconds');
}

async function runPerformanceTests() {
  console.log('⚡ OPENAI VISION API PERFORMANCE DIAGNOSIS');
  console.log('=' .repeat(60));
  console.log('Purpose: Find why OpenAI Vision takes 23+ seconds\n');
  
  const { tinyImage, smallImage, largeImage } = createTestImages();
  
  // Test different image sizes
  const results = [];
  
  results.push(await testImageProcessingSpeed('tiny-1x1-pixel', tinyImage));
  results.push(await testImageProcessingSpeed('small-with-text', smallImage));
  results.push(await testImageProcessingSpeed('large-dive-computer', largeImage));
  
  // Analyze results
  console.log('\n📊 PERFORMANCE ANALYSIS:');
  console.log('=' .repeat(40));
  
  results.forEach((result, index) => {
    const imageName = ['tiny', 'small', 'large'][index];
    if (result.success) {
      console.log(`${imageName}: ${(result.time/1000).toFixed(2)}s (${result.tokens} tokens)`);
    } else {
      console.log(`${imageName}: FAILED after ${(result.time/1000).toFixed(2)}s`);
    }
  });
  
  await testPromptComplexity();
  
  console.log('\n🎯 LIKELY CAUSES OF SLOW PERFORMANCE:');
  console.log('1. Very long prompt with detailed analysis requirements');
  console.log('2. High-detail image processing (detail: "high")');
  console.log('3. Complex JSON response structure');
  console.log('4. Server processing time (image optimization, database saves)');
  console.log('\n💡 SOLUTIONS:');
  console.log('1. Add "simple analysis" mode with shorter prompt');
  console.log('2. Use detail: "low" for basic analysis');
  console.log('3. Cache common analysis patterns');
  console.log('4. Optimize image processing pipeline');
}

// Run the performance tests
runPerformanceTests().catch(console.error);
