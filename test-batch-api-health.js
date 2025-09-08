#!/usr/bin/env node

// 🧪 TEST: Simple API Health Check for Batch Processing
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = '35b522f1-27d2-49de-ed2b-0d257d33ad7d';

async function testAPIHealth() {
  console.log('🧪 BATCH PROCESSING API HEALTH CHECK');
  console.log('=' .repeat(50));
  
  // Test 1: Check if batch-logs API exists
  console.log('\n📊 Test 1: Batch logs API availability...');
  try {
    const response = await fetch(`${BASE_URL}/api/dive/batch-logs?userId=${TEST_USER_ID}&limit=1`);
    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Batch logs API: WORKING');
      console.log(`Found ${result.diveLogs?.length || 0} existing logs`);
    } else {
      const text = await response.text();
      console.log('❌ Batch logs API: FAILED');
      console.log('Error:', text.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Batch logs API: ERROR');
    console.log('Error:', error.message);
  }
  
  // Test 2: Check if batch-analysis API exists
  console.log('\n🔍 Test 2: Batch analysis API availability...');
  try {
    const response = await fetch(`${BASE_URL}/api/dive/batch-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        analysisType: 'pattern',
        timeRange: 'all'
      })
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (response.status === 400) {
      // Expected - no logs to analyze
      console.log('✅ Batch analysis API: AVAILABLE (no logs to analyze)');
    } else if (response.ok) {
      console.log('✅ Batch analysis API: WORKING');
    } else {
      const text = await response.text();
      console.log('❌ Batch analysis API: FAILED');
      console.log('Error:', text.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Batch analysis API: ERROR');
    console.log('Error:', error.message);
  }
  
  // Test 3: Check existing dive-logs API
  console.log('\n📋 Test 3: Existing dive logs API...');
  try {
    const response = await fetch(`${BASE_URL}/api/supabase/dive-logs?userId=${TEST_USER_ID}`);
    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Existing dive logs API: WORKING');
      console.log(`Found ${result.diveLogs?.length || 0} existing logs`);
    } else {
      const text = await response.text();
      console.log('❌ Existing dive logs API: FAILED');
      console.log('Error:', text.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Existing dive logs API: ERROR');
    console.log('Error:', error.message);
  }
  
  // Test 4: Try to save a simple dive log
  console.log('\n💾 Test 4: Save dive log API...');
  const testLog = {
    id: `health-test-${Date.now()}`,
    user_id: TEST_USER_ID,
    date: new Date().toISOString().split('T')[0],
    discipline: "CWT",
    location: "Test Pool",
    targetDepth: "30",
    reachedDepth: "30",
    totalDiveTime: "120",
    notes: "Health check test log"
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testLog)
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ Save dive log API: WORKING');
    } else {
      const text = await response.text();
      console.log('❌ Save dive log API: FAILED');
      console.log('Error:', text.substring(0, 300));
    }
  } catch (error) {
    console.log('❌ Save dive log API: ERROR');
    console.log('Error:', error.message);
  }
  
  console.log('\n🎯 HEALTH CHECK SUMMARY:');
  console.log('=' .repeat(40));
  console.log('If all APIs show ✅ or expected behavior, batch processing is ready!');
  console.log('If there are ❌ errors, check server logs and database connection.');
}

testAPIHealth();
