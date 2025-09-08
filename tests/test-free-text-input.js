#!/usr/bin/env node

// 🧪 TEST: Verify all enums are removed and free text works
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = '35b522f1-27d2-49de-ed2b-0d257d33ad7d';

// Test with various free text inputs
const freeTextTests = [
  {
    name: "Natural Language Input",
    data: {
      id: `test-natural-${Date.now()}`,
      user_id: TEST_USER_ID,
      date: new Date().toISOString().split('T')[0],
      discipline: "Constant Weight with carbon fiber bifins",
      location: "Blue Hole, Dahab - deep section",
      targetDepth: "60",
      reachedDepth: "58",
      totalDiveTime: "2:45",
      surface_protocol: "Clean exit with good recovery, felt strong",
      exit_protocol: "Perfect surface protocol, no issues",
      attempt_type: "Training dive to work on mouthfill technique",
      notes: "Great dive, mouthfill felt secure at 25m"
    }
  },
  {
    name: "Short Codes (like before)",
    data: {
      id: `test-codes-${Date.now()}`,
      user_id: TEST_USER_ID,
      date: new Date().toISOString().split('T')[0],
      discipline: "CWT",
      location: "Pool",
      targetDepth: "40",
      reachedDepth: "40",
      totalDiveTime: "2:00",
      surface_protocol: "Clean",
      exit_protocol: "Good",
      attempt_type: "Training",
      notes: "Quick training session"
    }
  },
  {
    name: "Detailed Descriptions",
    data: {
      id: `test-detailed-${Date.now()}`,
      user_id: TEST_USER_ID,
      date: new Date().toISOString().split('T')[0],
      discipline: "Modified CNF technique with slight dolphin kick",
      location: "Dean's Blue Hole - competition platform area",
      targetDepth: "85",
      reachedDepth: "82",
      totalDiveTime: "3:15",
      surface_protocol: "Slight samba on arrival but recovered quickly within 10 seconds",
      exit_protocol: "Clean surface protocol after brief recovery period",
      attempt_type: "Competition preparation dive with video analysis",
      notes: "Working on freefall technique, need to improve equalization efficiency around 40-50m depth range"
    }
  }
];

async function testFreeTextInput() {
  console.log('🧪 Testing Free Text Input (No Enum Constraints)');
  console.log('=' .repeat(60));
  console.log('NOTE: Run remove-all-enums.sql on Supabase first!\n');
  
  for (const test of freeTextTests) {
    console.log(`🔍 Testing: ${test.name}`);
    console.log('Input examples:');
    console.log(`  discipline: "${test.data.discipline}"`);
    console.log(`  surface_protocol: "${test.data.surface_protocol}"`);
    console.log(`  attempt_type: "${test.data.attempt_type}"`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.data)
      });
      
      const result = await response.text();
      
      if (response.ok) {
        console.log('✅ SUCCESS - Free text accepted!');
        const parsed = JSON.parse(result);
        console.log(`   Saved with ID: ${parsed.data?.id || 'unknown'}`);
      } else {
        console.log('❌ FAILED');
        console.log(`   Error: ${result}`);
        
        if (result.includes('enum')) {
          console.log('   🚨 ENUM CONSTRAINT STILL EXISTS - Run the SQL file!');
        }
      }
      
    } catch (error) {
      console.log('❌ ERROR:', error.message);
    }
    
    console.log('');
  }
  
  console.log('🎯 RESULT:');
  console.log('✅ If all tests pass: Users can now input natural language!');
  console.log('❌ If tests fail: Enum constraints still exist in database');
  console.log('\n💡 NEXT: OpenAI will process these free text descriptions');
  console.log('   and extract structured insights automatically!');
}

testFreeTextInput();
