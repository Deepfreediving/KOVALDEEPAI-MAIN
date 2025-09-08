#!/usr/bin/env node

// 🧪 TEST: Frontend App vs Direct API Calls - Why do they behave differently?
const fetch = require('node-fetch');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = '35b522f1-27d2-49de-ed2b-0d257d33ad7d';

// Test dive log that should work
const testDiveLog = {
  id: `test-${Date.now()}`,
  user_id: TEST_USER_ID,
  date: new Date().toISOString().split('T')[0],
  disciplineType: "depth",
  discipline: "CWT", // This might fail due to enum
  location: "Test Pool",
  targetDepth: "50",
  reachedDepth: "48",
  totalDiveTime: "2:30",
  notes: "Test dive log"
  // Removing problematic fields to test basic save
};

async function testDirectAPICall() {
  console.log('🧪 Test 1: Direct API Call (like your tests)');
  console.log('=' .repeat(50));
  
  try {
    const response = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testDiveLog)
    });
    
    const result = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', result.substring(0, 200) + '...');
    
    if (response.ok) {
      console.log('✅ Direct API call: SUCCESS');
      return JSON.parse(result);
    } else {
      console.log('❌ Direct API call: FAILED');
      console.log('Error details:', result);
      return null;
    }
  } catch (error) {
    console.log('❌ Direct API call: ERROR', error.message);
    return null;
  }
}

async function testFrontendWorkflow() {
  console.log('\n🧪 Test 2: Frontend Workflow Simulation');
  console.log('=' .repeat(50));
  
  // First save the dive log (frontend step 1)
  console.log('Step 1: Save dive log...');
  const savedLog = await testDirectAPICall();
  
  if (!savedLog) {
    console.log('❌ Cannot test frontend workflow - dive log save failed');
    return;
  }
  
  // Then upload image (frontend step 2)
  console.log('\nStep 2: Upload image with dive log ID...');
  
  try {
    // Create simple test image
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const imagePayload = {
      imageData: testImageData,
      userId: TEST_USER_ID,
      filename: 'test-image.png',
      diveLogId: savedLog.data?.id || savedLog.diveLog?.id
    };
    
    const imageResponse = await fetch(`${BASE_URL}/api/dive/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(imagePayload)
    });
    
    const imageResult = await imageResponse.text();
    console.log('Image upload status:', imageResponse.status);
    console.log('Image response:', imageResult.substring(0, 200) + '...');
    
    if (imageResponse.ok) {
      console.log('✅ Frontend workflow: SUCCESS');
    } else {
      console.log('❌ Frontend workflow: FAILED');
    }
    
  } catch (error) {
    console.log('❌ Frontend workflow: ERROR', error.message);
  }
}

async function testActualFrontendData() {
  console.log('\n🧪 Test 3: Actual Frontend Form Data');
  console.log('=' .repeat(50));
  
  // Simulate exactly what the frontend sends
  const frontendData = {
    id: `dive-${Date.now()}-frontend`,
    user_id: TEST_USER_ID,
    date: new Date().toISOString().split('T')[0],
    disciplineType: "depth",
    discipline: "Constant Weight", // This is what frontend probably sends
    location: "Blue Hole Cyprus",
    targetDepth: "42",
    reachedDepth: "42",
    mouthfillDepth: "25",
    issueDepth: "",
    issueComment: "",
    squeeze: false,
    exit: "Good", // This might cause enum issues
    durationOrDistance: "",
    totalDiveTime: "2:15",
    attemptType: "training dive",
    surfaceProtocol: "Good", // This definitely causes enum issues
    notes: "Good dive, felt strong",
    // Advanced fields that frontend includes
    bottomTime: "5",
    earSqueeze: false,
    lungSqueeze: false,
    narcosisLevel: "1",
    recoveryQuality: "8",
    gear: {
      wetsuit: "3mm",
      fins: "Leaderfins",
      mask: "Omer Alien",
      weights_kg: "2",
      nose_clip: false,
      lanyard: true,
      computer: "ORCA"
    }
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(frontendData)
    });
    
    const result = await response.text();
    console.log('Frontend data status:', response.status);
    console.log('Frontend data response:', result);
    
    if (response.ok) {
      console.log('✅ Frontend data: SUCCESS');
    } else {
      console.log('❌ Frontend data: FAILED');
      
      // Analyze the error
      if (result.includes('enum')) {
        console.log('🔍 ENUM ERROR DETECTED:');
        console.log('- discipline:', frontendData.discipline);
        console.log('- exit:', frontendData.exit);
        console.log('- surfaceProtocol:', frontendData.surfaceProtocol);
        console.log('- attemptType:', frontendData.attemptType);
      }
    }
    
  } catch (error) {
    console.log('❌ Frontend data: ERROR', error.message);
  }
}

async function runFrontendDiagnostics() {
  console.log('🔍 FRONTEND vs API DISCONNECT DIAGNOSIS');
  console.log('=' .repeat(60));
  console.log('Purpose: Find why frontend app fails while API tests work\n');
  
  await testDirectAPICall();
  await testFrontendWorkflow();
  await testActualFrontendData();
  
  console.log('\n🎯 DIAGNOSIS SUMMARY:');
  console.log('1. If direct API works but frontend fails = enum/data issues');
  console.log('2. If both fail = server/database issues');
  console.log('3. If both work = frontend-specific bug');
}

// Run the diagnosis
runFrontendDiagnostics().catch(console.error);
