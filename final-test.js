const fs = require('fs');

async function runFinalTest() {
  console.log('🎯 FINAL VERIFICATION TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Test 1: OpenAI Vision with real dive computer image
  console.log('1. 🔍 Testing OpenAI Vision with real dive computer image...');
  
  try {
    const imageBuffer = fs.readFileSync('/Users/danielkoval/Documents/buildaiagent/KovalDeepAI-main/apps/web/public/freedive log/110m PB Philippines (060719).jpg');
    const base64Image = imageBuffer.toString('base64');

    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer], { type: 'image/jpeg' }), '110m-pb.jpg');
    formData.append('userId', 'test-user');

    const visionResponse = await fetch('http://localhost:3001/api/dive/upload-image', {
      method: 'POST',
      body: formData
    });

    if (visionResponse.ok) {
      const visionResult = await visionResponse.json();
      const hasRealData = visionResult.extractedData && 
                          visionResult.extractedData.maxDepth !== 'N/A' && 
                          visionResult.extractedData.maxDepth !== null;
      
      console.log(`   ✅ Vision Analysis: ${hasRealData ? 'EXTRACTING REAL DATA' : 'Still returning N/A values'}`);
      if (hasRealData) {
        console.log(`   📊 Extracted: ${visionResult.extractedData.maxDepth}m, ${visionResult.extractedData.diveTime}, ${visionResult.extractedData.temperature}°C`);
      }
    } else {
      console.log('   ❌ Vision API failed');
    }
  } catch (error) {
    console.log('   ❌ Vision test failed:', error.message);
  }

  console.log('');

  // Test 2: AI Coaching Analysis with proper time formatting
  console.log('2. 🤖 Testing AI Coaching Analysis with time formatting...');
  
  try {
    const testDiveLog = {
      id: 'test-dive-final',
      date: '2019-06-06',
      discipline: 'CWT',
      location: 'Philippines',
      targetDepth: 110,
      reachedDepth: 112,
      totalDiveTime: 192, // 3:12 in seconds
      mouthfillDepth: 50,
      exit: 'clean',
      notes: 'Personal best dive',
      extractedText: 'Max Depth: 108.7m, Time: 02:53, Temp: 29°C'
    };

    const analysisResponse = await fetch('http://localhost:3001/api/analyze/dive-log-openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        diveLogData: testDiveLog,
        userId: 'test-user',
        nickname: 'Daniel'
      })
    });

    if (analysisResponse.ok) {
      const analysisResult = await analysisResponse.json();
      
      const isNaturalLanguage = typeof analysisResult.analysis === 'string' && 
                               !analysisResult.analysis.startsWith('{') &&
                               !analysisResult.analysis.includes('"congratulations"');
      
      const hasProperTimeFormat = analysisResult.analysis.includes('3:12') || 
                                 analysisResult.analysis.includes('3 minutes') || 
                                 analysisResult.analysis.includes('03:12');
      
      const hasRealData = analysisResult.analysis.includes('108.7') ||
                         analysisResult.analysis.includes('extracted');

      console.log(`   ✅ Response Format: ${isNaturalLanguage ? 'NATURAL LANGUAGE' : 'Still JSON objects'}`);
      console.log(`   ⏱️  Time Display: ${hasProperTimeFormat ? 'USER-FRIENDLY (MM:SS)' : 'Raw seconds or missing'}`);
      console.log(`   🎯 Data Usage: ${hasRealData ? 'USING REAL EXTRACTED DATA' : 'Generic/hypothetical'}`);
      
      if (isNaturalLanguage) {
        console.log('\n   📝 Sample Response:');
        console.log('   ─────────────────────────────────────────');
        console.log(`   ${analysisResult.analysis.substring(0, 200)}...`);
        console.log('   ─────────────────────────────────────────');
      }
    } else {
      console.log('   ❌ Coaching analysis failed');
    }
  } catch (error) {
    console.log('   ❌ Coaching test failed:', error.message);
  }

  console.log('');

  // Test 3: General Chat (should not include dive logs unless requested)
  console.log('3. 💬 Testing General Chat (no dive log spam)...');
  
  try {
    const chatResponse = await fetch('http://localhost:3001/api/openai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'What are the 4 rules of direct supervision?' }
        ],
        userId: 'test-user'
      })
    });

    if (chatResponse.ok) {
      const chatResult = await chatResponse.json();
      
      const isNaturalLanguage = typeof chatResult.assistantMessage.content === 'string' &&
                               !chatResult.assistantMessage.content.startsWith('{') &&
                               !chatResult.assistantMessage.content.includes('"safety_assessment"');
      
      const noDiveLogSpam = !chatResult.assistantMessage.content.includes('dive log') ||
                           chatResult.assistantMessage.content.includes('analyze');

      console.log(`   ✅ Response Format: ${isNaturalLanguage ? 'NATURAL LANGUAGE' : 'Still JSON format'}`);
      console.log(`   🚫 Dive Log Spam: ${noDiveLogSpam ? 'CONTROLLED (only when requested)' : 'Still sending logs unnecessarily'}`);
      
      if (isNaturalLanguage) {
        console.log('\n   📝 Sample Response:');
        console.log('   ─────────────────────────────────────────');
        console.log(`   ${chatResult.assistantMessage.content.substring(0, 150)}...`);
        console.log('   ─────────────────────────────────────────');
      }
    } else {
      console.log('   ❌ Chat test failed');
    }
  } catch (error) {
    console.log('   ❌ Chat test failed:', error.message);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎯 TEST COMPLETE - Check results above for any remaining issues');
  console.log('═══════════════════════════════════════════════════════════════');
}

runFinalTest();