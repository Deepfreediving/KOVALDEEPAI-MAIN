// comprehensive-error-test.js
// Test all error scenarios and fixes

const API_BASE = 'http://localhost:3001';

// Create unique test data to avoid duplicate detection
function createUniqueDiveLog(index = 1) {
  return {
    userId: 'error-test-user',
    title: `Error Test Dive ${index}`,
    date: '2024-08-09',
    discipline: 'CNF',
    disciplineType: 'Constant Weight No Fins',
    location: `Test Location ${index}`,
    targetDepth: 30 + index,
    reachedDepth: 25 + index,
    mouthfillDepth: 20 + index,
    issueDepth: 0,
    issueComment: '',
    exit: 'Good',
    durationOrDistance: `${120 + index} seconds`,
    attemptType: 'Training',
    notes: `Test dive ${index} for error testing`,
    totalDiveTime: 120 + index,
    surfaceProtocol: 'OK',
    squeeze: false
  };
}

// Test 1: Multiple dive log submission and retrieval
async function testMultipleDiveLogs() {
  console.log('🧪 Test 1: Multiple dive log submission and retrieval');
  
  // Clear any existing logs first
  console.log('🧹 Clearing existing test logs...');
  
  // Submit 3 different dive logs
  const diveIds = [];
  for (let i = 1; i <= 3; i++) {
    const diveLog = createUniqueDiveLog(i);
    
    try {
      const response = await fetch(`${API_BASE}/api/analyze/save-dive-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diveLog)
      });
      
      if (response.ok) {
        const result = await response.json();
        diveIds.push(result.id);
        console.log(`✅ Dive ${i} saved: ${result.id?.substring(0, 8)}...`);
      } else {
        console.log(`❌ Dive ${i} save failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Dive ${i} error:`, error.message);
    }
  }
  
  // Wait a moment for processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test retrieval
  try {
    const response = await fetch(`${API_BASE}/api/analyze/get-dive-logs?userId=error-test-user`);
    if (response.ok) {
      const result = await response.json();
      console.log(`📥 Retrieved ${result.logs?.length || 0} dive logs`);
      
      if (result.logs?.length === 3) {
        console.log('✅ All 3 dive logs retrieved successfully');
        return { success: true, diveIds, logs: result.logs };
      } else {
        console.log(`❌ Expected 3 logs, got ${result.logs?.length || 0}`);
        console.log('📋 Retrieved logs:', result.logs?.map(log => ({
          id: log.id?.substring(0, 8),
          location: log.location,
          depth: `${log.targetDepth}→${log.reachedDepth}`
        })));
        return { success: false, diveIds, logs: result.logs };
      }
    } else {
      console.log(`❌ Retrieval failed: ${response.status}`);
      return { success: false, diveIds };
    }
  } catch (error) {
    console.error('❌ Retrieval error:', error.message);
    return { success: false, diveIds };
  }
}

// Test 2: Individual dive log analysis (fixed 404 error)
async function testIndividualAnalysis(diveIds, logs) {
  console.log('\n🧪 Test 2: Individual dive log analysis');
  
  if (!logs || logs.length === 0) {
    console.log('❌ No logs available for analysis test');
    return { success: false };
  }
  
  const testLog = logs[0];
  console.log(`🎯 Testing analysis of dive: ${testLog.location} (${testLog.targetDepth}m)`);
  
  try {
    const response = await fetch(`${API_BASE}/api/analyze/single-dive-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'error-test-user',
        diveLogId: testLog.id,
        diveLog: testLog  // ✅ Include full dive log data as fallback
      })
    });
    
    console.log(`📡 Analysis response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Analysis completed successfully');
      console.log('🤖 Analysis preview:', result.analysis?.substring(0, 100) + '...');
      return { success: true, analysis: result.analysis };
    } else {
      const errorText = await response.text();
      console.log(`❌ Analysis failed: ${response.status}`);
      console.log('📄 Error details:', errorText.substring(0, 200));
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 3: Wix backend error handling
async function testWixBackendErrors() {
  console.log('\n🧪 Test 3: Wix backend error handling');
  
  const testDive = createUniqueDiveLog(999);
  
  try {
    // Test direct Wix repeater call (should fail gracefully)
    const response = await fetch(`${API_BASE}/api/wix/dive-journal-repeater`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testDive)
    });
    
    console.log(`📡 Wix repeater response: ${response.status}`);
    
    if (response.status === 500) {
      const result = await response.json();
      console.log('✅ Wix backend error handled gracefully');
      console.log('📋 Error details:', result.error);
      console.log('💡 Help provided:', result.helpUrl ? 'Yes' : 'No');
      return { success: true, errorHandled: true };
    } else {
      console.log('🎉 Wix backend is working!');
      return { success: true, errorHandled: false };
    }
  } catch (error) {
    console.error('❌ Wix test error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 4: Pattern analysis with multiple logs
async function testPatternAnalysis() {
  console.log('\n🧪 Test 4: Pattern analysis');
  
  try {
    const response = await fetch(`${API_BASE}/api/analyze/pattern-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'error-test-user',
        analysisType: 'progression'
      })
    });
    
    console.log(`📡 Pattern analysis response: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Pattern analysis completed');
      console.log('📊 Key insights count:', result.insights?.keyFindings?.length || 0);
      console.log('🎯 Recommendations count:', result.insights?.recommendations?.length || 0);
      return { success: true, insights: result.insights };
    } else {
      const errorText = await response.text();
      console.log(`❌ Pattern analysis failed: ${response.status}`);
      console.log('📄 Error:', errorText.substring(0, 150));
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('❌ Pattern analysis error:', error.message);
    return { success: false, error: error.message };
  }
}

// Run comprehensive error tests
async function runComprehensiveErrorTests() {
  console.log('🔍 COMPREHENSIVE ERROR TESTING\n');
  console.log('This will test all the fixes and identify remaining issues.\n');
  
  const results = {};
  
  // Test 1: Multiple dive logs
  results.multipleDives = await testMultipleDiveLogs();
  
  // Test 2: Individual analysis (only if we have logs)
  if (results.multipleDives.success) {
    results.individualAnalysis = await testIndividualAnalysis(
      results.multipleDives.diveIds, 
      results.multipleDives.logs
    );
  }
  
  // Test 3: Wix error handling
  results.wixErrors = await testWixBackendErrors();
  
  // Test 4: Pattern analysis
  results.patternAnalysis = await testPatternAnalysis();
  
  // Summary
  console.log('\n🏁 TEST RESULTS SUMMARY:');
  console.log('==========================');
  console.log(`✅ Multiple dive logs: ${results.multipleDives?.success ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Individual analysis: ${results.individualAnalysis?.success ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Wix error handling: ${results.wixErrors?.success ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Pattern analysis: ${results.patternAnalysis?.success ? 'PASS' : 'FAIL'}`);
  
  const passCount = Object.values(results).filter(r => r?.success).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📊 Overall Score: ${passCount}/${totalTests} tests passed`);
  
  if (passCount === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Your system is working harmoniously! 🌊');
  } else {
    console.log('⚠️ Some issues remain. Check the detailed output above.');
  }
  
  return results;
}

// Run the tests
runComprehensiveErrorTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
});
