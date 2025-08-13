// 🧪 KOVAL DEEP AI - END-TO-END INTEGRATION TEST
// Test script to verify backend-frontend-collection integration
// Run this in your Wix site console after deployment

console.log('🚀 Starting KovalDeepAI Integration Test...');

// Test Configuration
const TEST_CONFIG = {
  userId: 'test-user-' + Date.now(),
  testDiveLog: {
    date: '2024-01-15',
    discipline: 'CWT',
    location: 'Test Location',
    targetDepth: 30,
    reachedDepth: 28,
    mouthfillDepth: 15,
    notes: 'Integration test dive log',
    totalDiveTime: 120,
    disciplineType: 'depth'
  }
};

// Test Results Tracker
const testResults = {
  backendConnection: false,
  diveLogSave: false,
  diveLogRetrieve: false,
  chatIntegration: false,
  userIdDisplay: false
};

// 🔥 TEST 1: Backend Connection Test
async function testBackendConnection() {
  console.log('\n📡 TEST 1: Backend Connection...');
  
  try {
    const response = await fetch('/_functions/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'integration-test' })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Backend connection successful');
      testResults.backendConnection = true;
      return true;
    } else {
      console.log('❌ Backend connection failed:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ Backend connection error:', error);
    return false;
  }
}

// 🔥 TEST 2: Dive Log Save to Collection
async function testDiveLogSave() {
  console.log('\n💾 TEST 2: Dive Log Save to Collection...');
  
  try {
    const saveData = {
      userId: TEST_CONFIG.userId,
      diveLogData: TEST_CONFIG.testDiveLog,
      memoryContent: 'Test dive log memory for AI',
      sessionName: 'Integration Test Session'
    };
    
    const response = await fetch('/_functions/userMemory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saveData)
    });
    
    const result = await response.json();
    
    if (result.success && result.diveLogsCount >= 1) {
      console.log('✅ Dive log saved successfully');
      console.log(`📊 User now has ${result.diveLogsCount} dive logs`);
      console.log(`🗂️ Collection: @deepfreediving/kovaldeepai-app/Import1`);
      testResults.diveLogSave = true;
      return true;
    } else {
      console.log('❌ Dive log save failed:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ Dive log save error:', error);
    return false;
  }
}

// 🔥 TEST 3: Dive Log Retrieval
async function testDiveLogRetrieval() {
  console.log('\n📋 TEST 3: Dive Log Retrieval...');
  
  try {
    const response = await fetch(
      `/_functions/userMemory?userId=${TEST_CONFIG.userId}&includeDetails=true`
    );
    
    const result = await response.json();
    
    if (result.success && result.diveLogsCount > 0) {
      console.log('✅ Dive logs retrieved successfully');
      console.log(`📊 Found ${result.diveLogsCount} dive logs`);
      console.log('🏊 Sample dive log:', result.diveLogs[0]);
      testResults.diveLogRetrieve = true;
      return true;
    } else {
      console.log('❌ Dive log retrieval failed:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ Dive log retrieval error:', error);
    return false;
  }
}

// 🔥 TEST 4: Chat Integration with User Context
async function testChatIntegration() {
  console.log('\n🤖 TEST 4: AI Chat with User Context...');
  
  try {
    const chatData = {
      message: 'What can you tell me about my recent diving progress?',
      userId: TEST_CONFIG.userId,
      includeContext: true
    };
    
    const response = await fetch('/_functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatData)
    });
    
    const result = await response.json();
    
    if (result.success || result.response) {
      console.log('✅ AI chat integration working');
      console.log('🤖 AI Response snippet:', 
        result.response?.substring(0, 100) + '...' || 'Response received');
      testResults.chatIntegration = true;
      return true;
    } else {
      console.log('❌ Chat integration failed:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ Chat integration error:', error);
    return false;
  }
}

// 🔥 TEST 5: User ID Display Check
async function testUserIdDisplay() {
  console.log('\n👤 TEST 5: User ID Display...');
  
  try {
    // Try to get current user from Wix
    if (typeof wixUsers !== 'undefined') {
      const currentUser = await wixUsers.getCurrentUser();
      
      if (currentUser && currentUser.id) {
        console.log('✅ User authentication working');
        console.log(`👤 Current user ID: ${currentUser.id}`);
        testResults.userIdDisplay = true;
        return true;
      } else {
        console.log('⚠️ No authenticated user found');
        return false;
      }
    } else {
      console.log('⚠️ wixUsers not available in test environment');
      return false;
    }
  } catch (error) {
    console.log('❌ User ID check error:', error);
    return false;
  }
}

// 🔥 RUN ALL TESTS
async function runIntegrationTests() {
  console.log('🎯 Running Complete Integration Test Suite...');
  console.log('=' .repeat(50));
  
  // Run tests sequentially
  await testBackendConnection();
  await testDiveLogSave();
  await testDiveLogRetrieval();
  await testChatIntegration();
  await testUserIdDisplay();
  
  // Print results summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 INTEGRATION TEST RESULTS:');
  console.log('=' .repeat(50));
  
  Object.entries(testResults).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const passedTests = Object.values(testResults).filter(Boolean).length;
  const totalTests = Object.values(testResults).length;
  
  console.log(`\n🎯 Overall Score: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Your KovalDeepAI integration is ready for production!');
  } else if (passedTests >= totalTests * 0.8) {
    console.log('⚠️ Most tests passed. Minor issues may need attention.');
  } else {
    console.log('❌ Several tests failed. Please review backend deployment and configuration.');
  }
  
  console.log('\n📝 Next steps:');
  console.log('1. Deploy backend functions to live Wix site');
  console.log('2. Verify collection name matches your Wix database');
  console.log('3. Test with real users in production environment');
  console.log('4. Monitor performance and error rates');
  
  return { passedTests, totalTests, results: testResults };
}

// 🚀 EXECUTE TESTS
// Uncomment the line below to run the tests
// runIntegrationTests();

// 📋 MANUAL TEST INSTRUCTIONS
console.log('\n📋 To run this test:');
console.log('1. Copy this entire script');
console.log('2. Open your Wix site editor');
console.log('3. Go to Backend → Console');
console.log('4. Paste the script and run: runIntegrationTests()');
console.log('5. Review the test results');

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runIntegrationTests, testResults, TEST_CONFIG };
}
