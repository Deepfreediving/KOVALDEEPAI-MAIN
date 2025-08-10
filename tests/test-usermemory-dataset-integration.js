// test-usermemory-dataset-integration.js
// Test script to verify integration with UserMemory-@deepfreediving/kovaldeepai-app/Import1 dataset

const API_BASE = 'http://localhost:3001';

// Test data for dive log
const testDiveLog = {
  userId: 'test-member-123',
  title: 'Test Integration Dive',
  date: new Date().toISOString().split('T')[0],
  discipline: 'CNF',
  disciplineType: 'Pool Training',
  location: 'Test Pool',
  targetDepth: 30,
  reachedDepth: 28,
  mouthfillDepth: 25,
  issueDepth: 0,
  issueComment: '',
  exit: 'normal',
  durationOrDistance: '2:30',
  attemptType: 'training',
  notes: 'Testing UserMemory dataset integration - should appear in repeater',
  totalDiveTime: '2:30',
  surfaceProtocol: 'normal breathing',
  squeeze: false,
  progressionScore: 85,
  riskFactors: ['shallow water blackout potential'],
  technicalNotes: 'Good equalization, smooth descent'
};

async function testUserMemoryDatasetIntegration() {
  console.log('🧪 Testing UserMemory-@deepfreediving/kovaldeepai-app/Import1 dataset integration...\n');

  try {
    // Test 1: Save dive log to specific UserMemory dataset
    console.log('📊 Step 1: Saving dive log to UserMemory dataset...');
    const saveResponse = await fetch(`${API_BASE}/api/wix/dive-journal-repeater`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testDiveLog)
    });

    if (!saveResponse.ok) {
      throw new Error(`Save failed with status ${saveResponse.status}`);
    }

    const saveResult = await saveResponse.json();
    console.log('✅ Save successful:', {
      success: saveResult.success,
      wixId: saveResult.wixId?.substring(0, 12) + '...',
      dataset: 'UserMemory-@deepfreediving/kovaldeepai-app/Import1'
    });

    // Test 2: Retrieve dive logs from specific dataset
    console.log('\n📋 Step 2: Retrieving dive logs from UserMemory dataset...');
    const loadResponse = await fetch(`${API_BASE}/api/wix/dive-journal-repeater?userId=${testDiveLog.userId}&limit=10`);
    
    if (!loadResponse.ok) {
      throw new Error(`Load failed with status ${loadResponse.status}`);
    }

    const loadResult = await loadResponse.json();
    console.log('✅ Load successful:', {
      success: loadResult.success,
      count: loadResult.data?.length || 0,
      firstEntry: loadResult.data?.[0] ? {
        title: loadResult.data[0].title,
        discipline: loadResult.data[0].discipline,
        depth: loadResult.data[0].reachedDepth + 'm'
      } : 'No entries found'
    });

    // Test 3: Individual dive log analysis
    if (saveResult.wixId) {
      console.log('\n🔍 Step 3: Testing individual dive log analysis...');
      const analysisResponse = await fetch(`${API_BASE}/api/analyze/single-dive-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          diveLogId: saveResult.wixId,
          userId: testDiveLog.userId
        })
      });

      if (analysisResponse.ok) {
        const analysisResult = await analysisResponse.json();
        console.log('✅ Individual analysis successful:', {
          success: analysisResult.success,
          analysisLength: analysisResult.analysis?.length || 0,
          hasRecommendations: analysisResult.analysis?.includes('recommend') || false
        });
      } else {
        console.log('⚠️ Individual analysis failed:', analysisResponse.status);
      }
    }

    // Test 4: Pattern analysis across dataset
    console.log('\n🔬 Step 4: Testing pattern analysis...');
    const patternResponse = await fetch(`${API_BASE}/api/analyze/pattern-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testDiveLog.userId,
        analysisType: 'comprehensive',
        timeRange: '30days'
      })
    });

    if (patternResponse.ok) {
      const patternResult = await patternResponse.json();
      console.log('✅ Pattern analysis successful:', {
        success: patternResult.success,
        logsAnalyzed: patternResult.metadata?.logsAnalyzed || 0,
        hasInsights: !!(patternResult.insights && Object.keys(patternResult.insights).length > 0)
      });
    } else {
      console.log('⚠️ Pattern analysis failed:', patternResponse.status);
    }

    // Test 5: Chat integration with dataset logs
    console.log('\n💬 Step 5: Testing chat integration with dataset logs...');
    const chatResponse = await fetch(`${API_BASE}/api/openai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Analyze my recent dive performance and suggest improvements for my CNF training.',
        userId: testDiveLog.userId,
        profile: {
          nickname: 'Test Member',
          pb: 35,
          currentDepth: 30,
          isInstructor: false
        },
        embedMode: true
      })
    });

    if (chatResponse.ok) {
      const chatResult = await chatResponse.json();
      console.log('✅ Chat integration successful:', {
        hasResponse: !!chatResult.assistantMessage?.content,
        responseLength: chatResult.assistantMessage?.content?.length || 0,
        contextUsed: chatResult.metadata?.contextChunks || 0,
        diveLogs: chatResult.metadata?.diveContext || 0
      });
    } else {
      console.log('⚠️ Chat integration failed:', chatResponse.status);
    }

    console.log('\n🎯 UserMemory Dataset Integration Test Complete!');
    console.log('📊 Dataset: UserMemory-@deepfreediving/kovaldeepai-app/Import1');
    console.log('🔄 All dive logs should now appear in your Wix repeater connected to this dataset.');
    console.log('🤖 Click any log in the sidebar for instant AI analysis.');
    console.log('🔬 Systematic pattern analysis available for advanced coaching insights.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('- Ensure development server is running (npm run dev)');
    console.log('- Check Wix backend function userMemory is deployed');
    console.log('- Verify UserMemory dataset permissions');
    console.log('- Check API routes are accessible');
  }
}

// Run the test
testUserMemoryDatasetIntegration();
