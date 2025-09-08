#!/usr/bin/env node

// 🧪 TEST: Frontend App vs Direct API - Exact Workflow Simulation
const fetch = require('node-fetch');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = '35b522f1-27d2-49de-ed2b-0d257d33ad7d';

// Simulate EXACTLY what the frontend DiveJournalDisplay component sends
function createFrontendDiveLogData() {
  return {
    // This is exactly what DiveJournalDisplay.jsx creates
    id: `dive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: TEST_USER_ID,
    date: new Date().toISOString().split("T")[0],
    disciplineType: "depth",
    discipline: "Constant Weight", // Frontend might send this
    location: "Blue Hole Cyprus",
    targetDepth: "42",
    reachedDepth: "42", 
    mouthfillDepth: "25",
    issueDepth: "",
    issueComment: "",
    squeeze: false,
    exit: "Clean",
    durationOrDistance: "",
    totalDiveTime: "2:15",
    attemptType: "training dive",
    surfaceProtocol: "Good",
    notes: "Good dive, felt strong",
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
}

async function testFrontendWorkflowStep1_SaveDiveLog() {
  console.log('🧪 STEP 1: Frontend Dive Log Save (Exact Frontend Data)');
  console.log('=' .repeat(60));
  
  const frontendData = createFrontendDiveLogData();
  
  console.log('📝 Frontend data being sent:');
  console.log('  discipline:', frontendData.discipline);
  console.log('  surfaceProtocol:', frontendData.surfaceProtocol);
  console.log('  exit:', frontendData.exit);
  console.log('  attemptType:', frontendData.attemptType);
  
  try {
    const response = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(frontendData)
    });
    
    const result = await response.text();
    console.log('📥 Response status:', response.status);
    console.log('📥 Response preview:', result.substring(0, 200) + '...');
    
    if (response.ok) {
      console.log('✅ Frontend dive log save: SUCCESS');
      const parsed = JSON.parse(result);
      const savedId = parsed.data?.id || parsed.diveLog?.id || frontendData.id;
      console.log('🆔 Saved dive log ID:', savedId);
      return savedId;
    } else {
      console.log('❌ Frontend dive log save: FAILED');
      console.log('Full error:', result);
      return null;
    }
    
  } catch (error) {
    console.log('❌ Frontend dive log save: ERROR', error.message);
    return null;
  }
}

async function testFrontendWorkflowStep2_UploadImage(diveLogId) {
  console.log('\n🧪 STEP 2: Frontend Image Upload (Exact Frontend Method)');
  console.log('=' .repeat(60));
  
  if (!diveLogId) {
    console.log('❌ Cannot test image upload - no dive log ID');
    return false;
  }
  
  try {
    // Method 1: Test FormData upload (like frontend file upload)
    console.log('📤 Testing FormData upload (like file input)...');
    
    const formData = new FormData();
    // Create a tiny test image buffer
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    
    formData.append('image', testImageBuffer, {
      filename: 'test-dive-computer.png',
      contentType: 'image/png'
    });
    formData.append('diveLogId', diveLogId);
    formData.append('userId', TEST_USER_ID);
    
    const response1 = await fetch(`${BASE_URL}/api/dive/upload-image`, {
      method: 'POST',
      body: formData
    });
    
    const result1 = await response1.text();
    console.log('📥 FormData response status:', response1.status);
    console.log('📥 FormData response preview:', result1.substring(0, 200) + '...');
    
    if (response1.ok) {
      console.log('✅ FormData upload: SUCCESS');
    } else {
      console.log('❌ FormData upload: FAILED');
    }
    
    // Method 2: Test JSON upload (like frontend base64)
    console.log('\n📤 Testing JSON base64 upload (like frontend imagePreview)...');
    
    const jsonPayload = {
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      userId: TEST_USER_ID,
      filename: 'frontend-test.png',
      diveLogId: diveLogId
    };
    
    const response2 = await fetch(`${BASE_URL}/api/dive/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jsonPayload)
    });
    
    const result2 = await response2.text();
    console.log('📥 JSON upload response status:', response2.status);
    console.log('📥 JSON upload response preview:', result2.substring(0, 200) + '...');
    
    if (response2.ok) {
      console.log('✅ JSON base64 upload: SUCCESS');
      return true;
    } else {
      console.log('❌ JSON base64 upload: FAILED');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Image upload: ERROR', error.message);
    return false;
  }
}

async function testMyDirectAPICall() {
  console.log('\n🧪 STEP 3: My Direct API Call (How My Tests Work)');
  console.log('=' .repeat(60));
  
  // This is how MY tests work (simplified data)
  const myTestData = {
    id: `my-test-${Date.now()}`,
    user_id: TEST_USER_ID,
    date: new Date().toISOString().split('T')[0],
    discipline: "CWT", // Simplified
    location: "Test Pool",
    targetDepth: "50",
    reachedDepth: "48",
    totalDiveTime: "2:30",
    notes: "Test dive"
    // Note: I don't send all the extra fields
  };
  
  console.log('📝 My test data (simplified):');
  console.log('  discipline:', myTestData.discipline);
  console.log('  fields count:', Object.keys(myTestData).length);
  
  try {
    const response = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(myTestData)
    });
    
    const result = await response.text();
    
    if (response.ok) {
      console.log('✅ My direct API call: SUCCESS');
      return true;
    } else {
      console.log('❌ My direct API call: FAILED');
      console.log('Error:', result);
      return false;
    }
    
  } catch (error) {
    console.log('❌ My direct API call: ERROR', error.message);
    return false;
  }
}

async function runCompleteComparison() {
  console.log('🔍 COMPLETE FRONTEND vs API COMPARISON TEST');
  console.log('🎯 PURPOSE: Find exact differences between frontend app and API tests');
  console.log('=' .repeat(70));
  
  // Test frontend workflow
  const savedLogId = await testFrontendWorkflowStep1_SaveDiveLog();
  const imageSuccess = await testFrontendWorkflowStep2_UploadImage(savedLogId);
  
  // Test my API approach
  const myApiSuccess = await testMyDirectAPICall();
  
  console.log('\n🎯 COMPARISON RESULTS:');
  console.log('=' .repeat(40));
  console.log('Frontend dive log save:', savedLogId ? '✅ SUCCESS' : '❌ FAILED');
  console.log('Frontend image upload:', imageSuccess ? '✅ SUCCESS' : '❌ FAILED');  
  console.log('My direct API calls:', myApiSuccess ? '✅ SUCCESS' : '❌ FAILED');
  
  console.log('\n🔍 ANALYSIS:');
  if (savedLogId && imageSuccess && myApiSuccess) {
    console.log('✅ ALL WORKING - Frontend should work same as API tests');
  } else if (myApiSuccess && !savedLogId) {
    console.log('🚨 FRONTEND DATA ISSUE - Frontend sends different data than API tests');
  } else if (myApiSuccess && savedLogId && !imageSuccess) {
    console.log('🚨 IMAGE UPLOAD ISSUE - Image processing fails for frontend');
  } else {
    console.log('🚨 GENERAL API ISSUE - Both frontend and tests failing');
  }
  
  console.log('\n💡 NEXT: Test your actual frontend app with a real dive log entry');
}

runCompleteComparison();
