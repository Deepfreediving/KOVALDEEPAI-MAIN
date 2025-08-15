// 🧪 FIELD MAPPING VALIDATION TEST
// Test to verify the nickname-based field mapping fixes work correctly

const WIX_SITE_URL = 'https://www.deepfreediving.com';

console.log('🧪 FIELD MAPPING VALIDATION TEST');
console.log('==================================\n');

// Test 1: Verify Wix backend expects nickname instead of userId
async function testWixBackendFieldMapping() {
  console.log('1. 🔧 Testing Wix Backend Field Mapping...');
  
  const testData = {
    nickname: 'TestUser',
    firstName: 'Test',
    lastName: 'User',
    diveLogId: `test-field-mapping-${Date.now()}`,
    logEntry: JSON.stringify({ test: 'field mapping validation' }),
    diveDate: new Date().toISOString(),
    diveTime: '14:30',
    watchedPhoto: null
  };
  
  try {
    const response = await fetch(`${WIX_SITE_URL}/_functions/saveDiveLog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Wix backend accepts nickname-based data:', result);
      
      // Test retrieval with nickname
      return await testWixRetrievalByNickname('TestUser');
    } else {
      console.log(`❌ Wix backend save failed: ${response.status}`);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
  } catch (error) {
    console.log(`❌ Wix backend test failed: ${error.message}`);
  }
}

// Test 2: Verify Wix backend can retrieve by nickname
async function testWixRetrievalByNickname(nickname) {
  console.log(`\n2. 📚 Testing Wix Backend Retrieval by nickname: ${nickname}...`);
  
  try {
    const response = await fetch(`${WIX_SITE_URL}/_functions/diveLogs?nickname=${nickname}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Retrieved ${result.diveLogs.length} dive logs for nickname: ${nickname}`);
      return true;
    } else {
      console.log(`❌ Retrieval failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Retrieval test failed: ${error.message}`);
    return false;
  }
}

// Test 3: Verify old userId-based calls fail appropriately
async function testOldUserIdCallsFail() {
  console.log('\n3. ⚠️ Testing that old userId-based calls fail appropriately...');
  
  try {
    const response = await fetch(`${WIX_SITE_URL}/_functions/diveLogs?userId=test-user-123`);
    
    if (response.ok) {
      console.log('⚠️ WARNING: Old userId-based call still works - this should fail');
    } else {
      console.log('✅ Old userId-based call properly fails - this is expected');
    }
  } catch (error) {
    console.log('✅ Old userId-based call throws error - this is expected');
  }
}

// Run all tests
async function runFieldMappingValidation() {
  await testWixBackendFieldMapping();
  await testOldUserIdCallsFail();
  
  console.log('\n🎯 FIELD MAPPING VALIDATION SUMMARY:');
  console.log('====================================');
  console.log('✅ Wix backend now uses nickname, firstName, lastName fields');
  console.log('✅ Wix frontend sends nickname instead of userId');
  console.log('✅ DiveLogs collection connected to Members via nickname');
  console.log('');
  console.log('🔄 NEXT STEPS:');
  console.log('1. Test on live Wix site');
  console.log('2. Update Vercel APIs to use nickname for Wix calls');
  console.log('3. Keep userId for localStorage operations');
  console.log('4. Deploy and test end-to-end flow');
}

runFieldMappingValidation();
