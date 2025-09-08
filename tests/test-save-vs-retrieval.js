#!/usr/bin/env node

// 🧪 TEST: Dive Log Save vs Retrieval - Are saved logs visible in frontend?
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = '35b522f1-27d2-49de-ed2b-0d257d33ad7d';

async function testSaveAndRetrieve() {
  console.log('🧪 Testing Dive Log Save vs Retrieval');
  console.log('🎯 PURPOSE: Check if saved logs appear in frontend Dive Journal');
  console.log('=' .repeat(60));
  
  // Step 1: Save a new dive log
  console.log('📝 STEP 1: Saving a new dive log...');
  
  const newDiveLog = {
    id: `test-save-retrieve-${Date.now()}`,
    user_id: TEST_USER_ID,
    date: new Date().toISOString().split('T')[0],
    discipline: "Test CWT Dive",
    location: "Test Location for Retrieval",
    targetDepth: "30",
    reachedDepth: "30",
    totalDiveTime: "2:00",
    notes: "This dive should appear in the frontend"
  };
  
  console.log('💾 Saving dive with identifier:', {
    id: newDiveLog.id,
    location: newDiveLog.location,
    date: newDiveLog.date
  });
  
  try {
    const saveResponse = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newDiveLog)
    });
    
    const saveResult = await saveResponse.text();
    
    if (!saveResponse.ok) {
      console.log('❌ Save failed:', saveResult);
      return;
    }
    
    const savedData = JSON.parse(saveResult);
    const savedId = savedData.data?.id || savedData.diveLog?.id || newDiveLog.id;
    console.log('✅ Dive log saved successfully! ID:', savedId);
    
    // Step 2: Check if there's a retrieval API
    console.log('\n🔍 STEP 2: Testing dive log retrieval APIs...');
    
    // Try common retrieval endpoints
    const retrievalEndpoints = [
      '/api/dive-logs',
      '/api/supabase/get-dive-logs',
      '/api/supabase/dive-logs',
      '/api/user/dive-logs',
      `/api/user/${TEST_USER_ID}/dive-logs`
    ];
    
    for (const endpoint of retrievalEndpoints) {
      try {
        console.log(`📡 Trying ${endpoint}...`);
        
        const retrieveResponse = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': TEST_USER_ID // Try passing user ID in header
          }
        });
        
        if (retrieveResponse.ok) {
          const retrieveResult = await retrieveResponse.text();
          console.log(`✅ ${endpoint} works! Response:`, retrieveResult.substring(0, 200) + '...');
          
          // Check if our saved dive is in the results
          if (retrieveResult.includes(newDiveLog.location) || retrieveResult.includes(savedId)) {
            console.log('🎉 FOUND OUR SAVED DIVE in the results!');
          } else {
            console.log('⚠️ Endpoint works but our dive is not in results');
          }
        } else {
          console.log(`❌ ${endpoint} failed:`, retrieveResponse.status);
        }
        
      } catch (error) {
        console.log(`❌ ${endpoint} error:`, error.message);
      }
    }
    
    // Step 3: Check what the frontend actually calls
    console.log('\n🕵️ STEP 3: Check what frontend calls for dive logs...');
    console.log('Looking for retrieval logic in DiveJournalDisplay component...');
    
    // Step 4: Test direct Supabase query
    console.log('\n🗄️ STEP 4: Check if data exists in Supabase...');
    
    const directQuery = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `SELECT * FROM dive_logs WHERE user_id = '${TEST_USER_ID}' ORDER BY created_at DESC LIMIT 5`
      })
    };
    
    // This would need a SQL endpoint, but let's see if there's one
    console.log('💡 Manual check needed: Go to Supabase dashboard and run:');
    console.log(`   SELECT * FROM dive_logs WHERE user_id = '${TEST_USER_ID}' ORDER BY created_at DESC;`);
    console.log('   Look for dive with location: "Test Location for Retrieval"');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

async function analyzeRetrieval() {
  console.log('\n📊 ANALYSIS: Why saved logs might not appear in frontend');
  console.log('=' .repeat(60));
  
  console.log('Possible causes:');
  console.log('1. 🔍 No retrieval API - Frontend has no way to get saved logs');
  console.log('2. 🆔 User ID mismatch - Saving with one ID, retrieving with another');
  console.log('3. 🏠 Local storage only - Frontend only shows locally stored logs');
  console.log('4. 🐛 Retrieval API broken - API exists but has bugs');
  console.log('5. 🔄 No refresh - Frontend doesn\'t refresh after save');
  console.log('6. 🎯 Wrong endpoint - Frontend calls different API than expected');
  
  console.log('\n🛠️ How to fix:');
  console.log('1. Check DiveJournalDisplay.jsx for how it loads dive logs');
  console.log('2. Create/fix the dive log retrieval API');
  console.log('3. Ensure consistent user ID between save and retrieval');
  console.log('4. Add proper refresh after save in frontend');
}

async function runSaveRetrievalTest() {
  await testSaveAndRetrieve();
  await analyzeRetrieval();
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Check your Supabase dashboard for the saved test dive');
  console.log('2. Find the retrieval logic in DiveJournalDisplay.jsx');
  console.log('3. Test your frontend app to see if dive appears after refresh');
}

runSaveRetrievalTest();
