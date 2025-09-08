// DEBUG TEST: Test OpenAI batch analysis endpoint directly
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

async function testBatchAnalysis() {
  console.log('🔍 DEBUG: Testing batch analysis API endpoint');
  console.log('===========================================');

  // Get a test user ID first by fetching some logs
  try {
    console.log('🔍 First, getting a test user ID...');
    
    const logsResponse = await fetch(`${API_BASE}/api/dive/batch-logs?userId=35b522f1-27d2-49de-ed2b-0d257d33ad7d&limit=1`);
    
    if (!logsResponse.ok) {
      console.log('❌ Could not fetch logs to get user ID');
      return false;
    }
    
    const logsData = await logsResponse.json();
    console.log(`✅ Found ${logsData.diveLogs?.length || 0} logs for user`);
    
    if (!logsData.diveLogs?.length) {
      console.log('❌ No logs found for testing');
      return false;
    }

    // Now test batch analysis
    console.log('\n🧠 Testing batch analysis...');
    
    const analysisResponse = await fetch(`${API_BASE}/api/dive/batch-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: '35b522f1-27d2-49de-ed2b-0d257d33ad7d',
        analysisType: 'pattern',
        timeRange: 'all'
      })
    });

    console.log(`📊 Analysis response status: ${analysisResponse.status} ${analysisResponse.statusText}`);

    const responseText = await analysisResponse.text();
    console.log('📊 Raw response text (first 500 chars):', responseText.substring(0, 500));

    try {
      const responseData = JSON.parse(responseText);
      console.log('📊 Parsed response:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.log('❌ Could not parse response as JSON');
    }

    return analysisResponse.ok;

  } catch (error) {
    console.error('❌ Network/fetch error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔥 Starting batch analysis debug test...\n');
  
  const success = await testBatchAnalysis();
  
  console.log('\n' + '='.repeat(50));
  console.log(success ? '✅ TEST PASSED' : '❌ TEST FAILED');
}

main().catch(console.error);
