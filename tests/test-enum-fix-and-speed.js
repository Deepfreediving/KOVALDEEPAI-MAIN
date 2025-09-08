#!/usr/bin/env node

// 🧪 TEST: Verify enum fix and investigate frontend vs API disconnect
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = '35b522f1-27d2-49de-ed2b-0d257d33ad7d';

async function testEnumFix() {
  console.log('🧪 Testing Enum Fix - Free Text Input');
  console.log('=' .repeat(50));
  
  const testData = {
    id: `test-enum-fix-${Date.now()}`,
    user_id: TEST_USER_ID,
    date: new Date().toISOString().split('T')[0],
    discipline: "Constant Weight with carbon fiber bifins",
    location: "Blue Hole, Dahab",
    targetDepth: "60",
    reachedDepth: "58",
    totalDiveTime: "2:45",
    surface_protocol: "Clean exit with good recovery, felt strong",
    exit_protocol: "Perfect surface protocol, no issues",
    attempt_type: "Training dive to work on mouthfill technique",
    notes: "Great dive, mouthfill felt secure at 25m"
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.text();
    
    if (response.ok) {
      console.log('✅ ENUM FIX SUCCESS - Free text accepted!');
      const parsed = JSON.parse(result);
      console.log(`   Saved dive log ID: ${parsed.data?.id || 'unknown'}`);
      return parsed.data?.id || parsed.diveLog?.id;
    } else {
      console.log('❌ ENUM FIX FAILED');
      console.log(`   Error: ${result}`);
      return null;
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return null;
  }
}

async function testImageProcessingSpeed() {
  console.log('\n🧪 Testing OpenAI Vision API Speed');
  console.log('=' .repeat(50));
  
  // Create minimal test image
  const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  
  const imagePayload = {
    imageData: testImageData,
    userId: TEST_USER_ID,
    filename: 'speed-test.png',
    diveLogId: null // No dive log for speed test
  };
  
  console.log('⏱️ Starting image processing...');
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/dive/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(imagePayload)
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const result = await response.text();
    
    console.log(`⏱️ Processing time: ${duration}ms (${(duration/1000).toFixed(1)}s)`);
    
    if (response.ok) {
      console.log('✅ Image processing successful');
      try {
        const parsed = JSON.parse(result);
        console.log(`   Tokens used: ${parsed.data?.tokensUsed || 'unknown'}`);
        console.log(`   Confidence: ${parsed.data?.analysis?.confidence || 'unknown'}`);
      } catch (e) {
        console.log('   Could not parse response details');
      }
    } else {
      console.log('❌ Image processing failed');
      console.log(`   Error: ${result.substring(0, 200)}...`);
    }
    
    // Analyze speed
    if (duration > 10000) {
      console.log('🚨 SLOW PROCESSING DETECTED (>10s)');
      console.log('   Possible causes:');
      console.log('   - Very long OpenAI prompt');
      console.log('   - Network latency');
      console.log('   - OpenAI API throttling');
      console.log('   - Image processing overhead');
    } else if (duration > 5000) {
      console.log('⚠️ Moderate processing time (5-10s)');
    } else {
      console.log('✅ Good processing speed (<5s)');
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

async function runDiagnostics() {
  console.log('🔍 FRONTEND vs API DISCONNECT DIAGNOSIS');
  console.log('🔍 OPENAI PROCESSING SPEED INVESTIGATION');
  console.log('=' .repeat(60));
  
  const savedLogId = await testEnumFix();
  await testImageProcessingSpeed();
  
  console.log('\n🎯 NEXT STEPS:');
  if (savedLogId) {
    console.log('✅ 1. Enum constraints fixed - frontend should work now');
    console.log('🧪 2. Test your frontend app with the same data');
    console.log('⏱️ 3. Compare OpenAI processing times');
  } else {
    console.log('❌ 1. Enum fix failed - check database migration');
  }
}

runDiagnostics();
