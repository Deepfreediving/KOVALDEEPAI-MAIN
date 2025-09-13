const fs = require('fs');
const FormData = require('form-data');

// Test the full coaching analysis pipeline
async function testCoachingAnalysis() {
  console.log('🧪 Testing AI coaching analysis with real dive data...\n');

  // Test data with properly converted time (3:12 = 192 seconds)
  const testDiveLog = {
    id: 'test-dive-123',
    date: '2019-06-06',
    discipline: 'CWT',
    location: 'Philippines',
    targetDepth: 110,
    reachedDepth: 112,
    totalDiveTime: 192, // 3:12 in seconds
    mouthfillDepth: 50,
    issueDepth: null,
    exit: 'clean',
    notes: 'Personal best dive, felt strong throughout',
    extractedText: 'Max Depth: 108.7m, Time: 02:53, Temp: 29°C',
    imageAnalysis: 'Real dive computer data extracted from image'
  };

  try {
    const response = await fetch('http://localhost:3001/api/analyze/dive-log-openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        diveLogData: testDiveLog,
        userId: 'test-user',
        nickname: 'Daniel'
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log('✅ Coaching Analysis Result:');
    console.log('═══════════════════════════════════════════');
    console.log(result.analysis);
    console.log('═══════════════════════════════════════════\n');

    // Check if time is properly formatted
    const hasProperTimeFormat = result.analysis.includes('3:12') || result.analysis.includes('3 minutes') || result.analysis.includes('03:12');
    const hasSecondsOnly = result.analysis.includes('192 seconds') && !hasProperTimeFormat;
    
    console.log('🔍 Analysis Quality Check:');
    console.log(`   ⏱️  Time format: ${hasProperTimeFormat ? '✅ User-friendly (MM:SS)' : hasSecondsOnly ? '❌ Shows raw seconds' : '⚠️  No time mentioned'}`);
    console.log(`   🎯 Real data usage: ${result.analysis.includes('108.7') ? '✅ Uses extracted image data' : '❌ No real extracted data'}`);
    console.log(`   💬 Natural language: ${typeof result.analysis === 'string' && !result.analysis.startsWith('{') ? '✅ Conversational' : '❌ Still JSON format'}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCoachingAnalysis();