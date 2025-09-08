// DEBUG TEST: Isolate dive log save API errors
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

async function testSaveDiveLog() {
  console.log('🔍 DEBUG: Testing dive log save API endpoint');
  console.log('=====================================');

  // Test data
  const testDiveLog = {
    date: '2024-01-15',
    discipline: 'CWT',
    location: 'Blue Hole Cyprus',
    targetDepth: 38,
    reachedDepth: 38,
    totalDiveTime: '2:30',
    notes: 'Good dive, felt strong'
  };

  console.log('📝 Test dive log data:', JSON.stringify(testDiveLog, null, 2));

  try {
    console.log(`🌐 Making request to: ${API_BASE}/api/supabase/save-dive-log`);
    
    const response = await fetch(`${API_BASE}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testDiveLog)
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📊 Raw response text:', responseText);

    try {
      const responseData = JSON.parse(responseText);
      console.log('📊 Parsed response:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.log('❌ Could not parse response as JSON');
    }

    if (!response.ok) {
      console.log(`❌ Request failed with status ${response.status}`);
      return false;
    }

    console.log('✅ Request successful');
    return true;

  } catch (error) {
    console.error('❌ Network/fetch error:', error.message);
    console.error('❌ Full error:', error);
    return false;
  }
}

async function main() {
  console.log('🔥 Starting dive log save debug test...\n');
  
  const success = await testSaveDiveLog();
  
  console.log('\n' + '='.repeat(50));
  console.log(success ? '✅ TEST PASSED' : '❌ TEST FAILED');
}

main().catch(console.error);
