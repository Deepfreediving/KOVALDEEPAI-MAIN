#!/usr/bin/env node

// Test to compare Frontend App workflow vs Direct API calls
const fetch = require('node-fetch');
const FormData = require('form-data');
const sharp = require('sharp');

const BASE_URL = 'http://localhost:3000';
const USER_ID = '35b522f1-27d2-49de-ed2b-0d257d33ad7d';

async function testFrontendVsAPI() {
  console.log('🧪 FRONTEND APP vs DIRECT API COMPARISON TEST');
  console.log('=' .repeat(60));
  
  // Create a simple test image
  const createTestImage = async () => {
    const svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#000033"/>
      <text x="200" y="50" text-anchor="middle" fill="#00ff99" font-family="Arial" font-size="16">DIVE COMPUTER</text>
      <text x="200" y="100" text-anchor="middle" fill="#ffff00" font-family="Arial" font-size="24">MAX: 45.2m</text>
      <text x="200" y="130" text-anchor="middle" fill="#ffff00" font-family="Arial" font-size="18">TIME: 2:45</text>
      <text x="200" y="160" text-anchor="middle" fill="#ffff00" font-family="Arial" font-size="16">TEMP: 24°C</text>
      <rect x="50" y="180" width="300" height="100" fill="#001144" stroke="#0066aa"/>
      <polyline points="60,190 120,220 180,250 240,220 300,190" fill="none" stroke="#00ff99" stroke-width="3"/>
    </svg>`;
    
    const imageBuffer = await sharp(Buffer.from(svg))
      .png()
      .resize(800, 600)
      .toBuffer();
    
    return imageBuffer;
  };

  try {
    const testImageBuffer = await createTestImage();
    
    // TEST 1: Direct API call (like my tests)
    console.log('\n🔬 TEST 1: Direct API Call (Backend Only)');
    console.log('-'.repeat(50));
    
    const directStartTime = Date.now();
    
    // Test the image upload API directly with base64
    const base64Image = `data:image/png;base64,${testImageBuffer.toString('base64')}`;
    
    const directApiResponse = await fetch(`${BASE_URL}/api/dive/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: base64Image,
        userId: USER_ID,
        filename: 'test-direct-api.png',
        diveLogId: null
      })
    });
    
    const directApiTime = Date.now() - directStartTime;
    const directResult = await directApiResponse.text();
    
    console.log(`⏱️  Direct API Time: ${directApiTime}ms (${(directApiTime/1000).toFixed(1)}s)`);
    console.log(`📊 Direct API Status: ${directApiResponse.status}`);
    console.log(`📝 Direct API Response Length: ${directResult.length} chars`);
    
    if (directApiResponse.ok) {
      try {
        const directData = JSON.parse(directResult);
        console.log(`✅ Direct API Success:`);
        console.log(`   - Confidence: ${directData.data?.analysis?.confidence}`);
        console.log(`   - Tokens: ${directData.data?.tokensUsed}`);
        console.log(`   - Max Depth: ${directData.data?.extractedMetrics?.max_depth || 'Not extracted'}`);
      } catch (e) {
        console.log(`❌ Direct API Response not JSON`);
      }
    } else {
      console.log(`❌ Direct API Failed: ${directResult.substring(0, 200)}...`);
    }
    
    // TEST 2: Frontend workflow simulation
    console.log('\n🎭 TEST 2: Frontend Workflow Simulation');
    console.log('-'.repeat(50));
    
    const frontendStartTime = Date.now();
    
    // Step 1: Save dive log first (like frontend does)
    const diveLogData = {
      id: `frontend-test-${Date.now()}`,
      user_id: USER_ID,
      date: new Date().toISOString().split('T')[0],
      discipline: "Constant Weight", // Frontend style
      location: "Test Pool",
      targetDepth: "45",
      reachedDepth: "45",
      totalDiveTime: "2:45",
      surfaceProtocol: "Clean recovery", // Frontend style
      notes: "Frontend workflow test"
    };
    
    console.log('📝 Step 1: Saving dive log...');
    const logSaveResponse = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(diveLogData)
    });
    
    const logSaveResult = await logSaveResponse.text();
    console.log(`📊 Log Save Status: ${logSaveResponse.status}`);
    
    if (!logSaveResponse.ok) {
      console.log(`❌ Frontend Step 1 Failed: ${logSaveResult}`);
      return;
    }
    
    const savedLogData = JSON.parse(logSaveResult);
    const savedLogId = savedLogData.data?.id || savedLogData.diveLog?.id;
    console.log(`✅ Step 1 Success: Log ID ${savedLogId}`);
    
    // Step 2: Upload image with FormData (like frontend does)
    console.log('📸 Step 2: Uploading image with FormData...');
    const formData = new FormData();
    formData.append('image', testImageBuffer, {
      filename: 'test-frontend.png',
      contentType: 'image/png'
    });
    formData.append('diveLogId', savedLogId);
    formData.append('userId', USER_ID);
    
    const frontendImageResponse = await fetch(`${BASE_URL}/api/dive/upload-image`, {
      method: 'POST',
      body: formData
    });
    
    const frontendImageTime = Date.now() - frontendStartTime;
    const frontendImageResult = await frontendImageResponse.text();
    
    console.log(`⏱️  Frontend Total Time: ${frontendImageTime}ms (${(frontendImageTime/1000).toFixed(1)}s)`);
    console.log(`📊 Frontend Image Status: ${frontendImageResponse.status}`);
    console.log(`📝 Frontend Response Length: ${frontendImageResult.length} chars`);
    
    if (frontendImageResponse.ok) {
      try {
        const frontendData = JSON.parse(frontendImageResult);
        console.log(`✅ Frontend Success:`);
        console.log(`   - Confidence: ${frontendData.data?.analysis?.confidence}`);
        console.log(`   - Tokens: ${frontendData.data?.tokensUsed}`);
        console.log(`   - Max Depth: ${frontendData.data?.extractedMetrics?.max_depth || 'Not extracted'}`);
      } catch (e) {
        console.log(`❌ Frontend Response not JSON`);
      }
    } else {
      console.log(`❌ Frontend Failed: ${frontendImageResult.substring(0, 200)}...`);
    }
    
    // COMPARISON
    console.log('\n📊 COMPARISON RESULTS');
    console.log('=' .repeat(60));
    console.log(`Direct API Time:  ${(directApiTime/1000).toFixed(1)}s`);
    console.log(`Frontend Time:    ${(frontendImageTime/1000).toFixed(1)}s`);
    console.log(`Time Difference:  ${((frontendImageTime - directApiTime)/1000).toFixed(1)}s`);
    console.log(`Direct Success:   ${directApiResponse.ok ? '✅' : '❌'}`);
    console.log(`Frontend Success: ${frontendImageResponse.ok ? '✅' : '❌'}`);
    
    if (frontendImageTime > 10000) {
      console.log('\n⚠️  SLOW PROCESSING DETECTED!');
      console.log('Possible causes:');
      console.log('- OpenAI API timeout/retry logic');
      console.log('- Large image processing');
      console.log('- Network issues');
      console.log('- Database operations blocking');
      console.log('- Multiple API calls in sequence');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testFrontendVsAPI();
