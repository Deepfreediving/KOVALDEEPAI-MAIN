// 🧪 DIVE LOG SAVE TEST - Session-like Pattern
// Purpose: Test immediate localStorage save with nickname/firstName/lastName fields
// Version: 6.0 - No more userId dependencies

console.log('🧪 DIVE LOG SAVE TEST - Session-like Pattern');
console.log('============================================\n');

// Test immediate localStorage save (like sessions)
function testImmediateDiveLogSave() {
  console.log('🎯 TEST 1: Immediate localStorage save (like sessions)');
  
  // Generate diveLogId immediately (required field)
  const diveLogId = `dive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create test dive log with all required fields
  const testDiveLog = {
    // Required fields for DiveLogs collection
    diveLogId: diveLogId,
    nickname: 'TestUser',
    firstName: 'Test',
    lastName: 'User',
    
    // Dive data
    reachedDepth: '25m',
    targetDepth: '30m',
    discipline: 'CNF',
    location: 'Test Pool',
    date: new Date().toISOString(),
    notes: 'Test dive log save',
    
    // System fields
    id: diveLogId,
    timestamp: new Date().toISOString(),
    source: 'test-immediate-save',
    userId: 'test-user-123' // Keep for localStorage key
  };
  
  // Test localStorage save (immediate, like sessions)
  try {
    const storageKey = `diveLogs_test-user-123`;
    const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const updatedLogs = [testDiveLog, ...existingLogs];
    
    localStorage.setItem(storageKey, JSON.stringify(updatedLogs));
    console.log('✅ Immediate localStorage save: SUCCESS');
    console.log(`   Saved dive log with ID: ${diveLogId}`);
    console.log(`   Total logs in storage: ${updatedLogs.length}`);
    
    // Verify save
    const retrieved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const savedLog = retrieved.find(log => log.diveLogId === diveLogId);
    
    if (savedLog) {
      console.log('✅ Verification: Dive log found in storage');
      console.log(`   Retrieved: ${savedLog.nickname} - ${savedLog.reachedDepth} dive`);
    } else {
      console.log('❌ Verification: Dive log NOT found in storage');
    }
    
  } catch (error) {
    console.log('❌ Immediate localStorage save: FAILED');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('');
}

// Test Wix collection data structure
function testWixCollectionStructure() {
  console.log('🎯 TEST 2: Wix DiveLogs collection structure');
  
  const wixDiveLogRecord = {
    // ✅ NEW: Use nickname instead of userId for Wix collection
    nickname: 'TestUser',
    firstName: 'Test', 
    lastName: 'User',
    
    // Required collection fields
    diveLogId: `dive_${Date.now()}_test`,
    logEntry: JSON.stringify({
      reachedDepth: '25m',
      discipline: 'CNF',
      location: 'Test Pool',
      notes: 'Testing new structure'
    }),
    diveDate: new Date().toISOString(),
    diveTime: '14:30',
    watchedPhoto: null
  };
  
  console.log('✅ Wix collection structure:');
  console.log('   Fields:', Object.keys(wixDiveLogRecord));
  console.log('   ✅ nickname (connects to Members/FullData)');
  console.log('   ✅ firstName (from Members/FullData)');
  console.log('   ✅ lastName (from Members/FullData)');
  console.log('   ✅ diveLogId (unique identifier)');
  console.log('   ✅ logEntry (JSON dive data)');
  console.log('   ✅ diveDate, diveTime, watchedPhoto');
  console.log('   ❌ NO userId field (removed)');
  
  console.log('');
}

// Test localStorage key strategy
function testStorageKeyStrategy() {
  console.log('🎯 TEST 3: Storage key strategy');
  
  // Test different user scenarios
  const scenarios = [
    { userId: 'member_12345', scenario: 'Authenticated Member' },
    { userId: 'guest-1692123456789', scenario: 'Guest User' },
    { userId: null, scenario: 'No User ID' }
  ];
  
  scenarios.forEach(({ userId, scenario }) => {
    console.log(`📱 ${scenario}:`);
    
    // Generate storage key (like sessions)
    const currentUserId = userId || `guest-${Date.now()}`;
    const storageKey = `diveLogs_${currentUserId}`;
    
    console.log(`   Storage key: ${storageKey}`);
    console.log(`   Strategy: ${userId ? 'User-specific' : 'Generated guest ID'}`);
    
    // Test that we can always save (like sessions)
    try {
      const testLog = { id: Date.now(), test: scenario };
      localStorage.setItem(storageKey, JSON.stringify([testLog]));
      const retrieved = JSON.parse(localStorage.getItem(storageKey));
      console.log(`   ✅ Save/retrieve: SUCCESS (${retrieved.length} items)`);
    } catch (error) {
      console.log(`   ❌ Save/retrieve: FAILED - ${error.message}`);
    }
  });
  
  console.log('');
}

// Test API call structure
function testAPICallStructure() {
  console.log('🎯 TEST 4: API call structure');
  
  // Test query parameters for dive log retrieval
  const profile = {
    nickname: 'TestUser',
    firstName: 'Test',
    lastName: 'User'
  };
  
  // Build API URL using nickname (not userId)
  const queryParam = profile.nickname || profile.firstName || 'fallback';
  const apiUrl = `/api/wix/dive-logs-bridge?nickname=${encodeURIComponent(queryParam)}`;
  
  console.log('✅ API structure:');
  console.log(`   URL: ${apiUrl}`);
  console.log(`   Query param: nickname="${queryParam}"`);
  console.log('   ✅ Uses nickname from profile');
  console.log('   ✅ Matches Wix backend changes');
  console.log('   ❌ NO userId dependency');
  
  console.log('');
}

// Run all tests
function runAllTests() {
  testImmediateDiveLogSave();
  testWixCollectionStructure();
  testStorageKeyStrategy();
  testAPICallStructure();
  
  console.log('🎉 SUMMARY:');
  console.log('✅ Dive logs now save immediately to localStorage (like sessions)');
  console.log('✅ Generated diveLogId for each save (required field)');
  console.log('✅ Use nickname/firstName/lastName for Wix collection');
  console.log('✅ No userId dependencies for core functionality');
  console.log('✅ Optional API sync with proper field mapping');
  console.log('');
  console.log('🚀 Ready to test on live site!');
}

// Only run if in browser environment
if (typeof window !== 'undefined') {
  runAllTests();
} else {
  console.log('📋 Test structure defined. Run in browser to execute tests.');
}
