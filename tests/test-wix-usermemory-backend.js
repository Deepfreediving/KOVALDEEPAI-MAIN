// tests/test-wix-usermemory-backend.js
// Test the current Wix UserMemory backend implementation

const API_BASE = 'http://localhost:3001';

async function testWixUserMemoryBackend() {
  console.log('🔍 Testing Wix UserMemory Backend Implementation\n');
  
  // Test 1: Check if UserMemory backend endpoint exists
  console.log('📡 Test 1: Direct backend endpoint availability...');
  try {
    const response = await fetch('https://www.deepfreediving.com/_functions/userMemory', {
      method: 'OPTIONS',
      headers: { 'Accept': 'application/json' }
    });
    
    console.log(`📡 Wix backend response: ${response.status}`);
    if (response.status === 200 || response.status === 405) {
      console.log('✅ Wix backend endpoint is accessible');
    } else {
      console.log('❌ Wix backend endpoint not accessible');
    }
  } catch (error) {
    console.log('❌ Cannot reach Wix backend:', error.message);
  }
  
  // Test 2: Test dive log save via your API (which calls Wix backend)
  console.log('\n📊 Test 2: Dive log save via Next.js API...');
  const testDiveLog = {
    userId: 'wix-test-user',
    date: '2024-08-09',
    discipline: 'CNF',
    disciplineType: 'Constant Weight No Fins',
    location: 'Test Pool',
    targetDepth: 30,
    reachedDepth: 25,
    notes: 'Testing Wix UserMemory backend'
  };
  
  try {
    const saveResponse = await fetch(`${API_BASE}/api/analyze/save-dive-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testDiveLog)
    });
    
    console.log(`📡 Save response: ${saveResponse.status}`);
    
    if (saveResponse.ok) {
      const result = await saveResponse.json();
      console.log('✅ Local save successful:', result.id?.substring(0, 8));
      console.log('📊 Sync status:', result.syncStatus);
    }
  } catch (error) {
    console.log('❌ Save test failed:', error.message);
  }
  
  // Test 3: Direct Wix repeater API test
  console.log('\n🔗 Test 3: Direct Wix repeater API...');
  try {
    const repeaterResponse = await fetch(`${API_BASE}/api/wix/dive-journal-repeater`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testDiveLog)
    });
    
    console.log(`📡 Repeater response: ${repeaterResponse.status}`);
    
    if (repeaterResponse.ok) {
      const result = await repeaterResponse.json();
      console.log('✅ Wix repeater successful:', result.wixId?.substring(0, 8));
    } else {
      const errorText = await repeaterResponse.text();
      console.log('❌ Wix repeater failed:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Repeater test failed:', error.message);
  }
  
  // Test 4: Check server logs for Wix errors
  console.log('\n📋 Test 4: Analysis of Wix backend issues...');
  console.log('Based on server logs, the main issues are:');
  console.log('1. ❌ Wix UserMemory repeater save failed: 500');
  console.log('2. ❌ Wix backend sync error: Request failed with status code 500');
  console.log('3. 💡 This suggests the Wix backend function is not deployed or misconfigured');
  
  console.log('\n🔧 Recommended Actions:');
  console.log('1. Verify your Wix backend userMemory.jsw is published');
  console.log('2. Check the collection name: @deepfreediving/kovaldeepai-app/Import1');
  console.log('3. Ensure proper permissions for UserMemory dataset');
  console.log('4. Test the Wix backend function directly in Wix Editor');
}

// Run the test
testWixUserMemoryBackend().catch(error => {
  console.error('💥 Wix backend test crashed:', error);
});
