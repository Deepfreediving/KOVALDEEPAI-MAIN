// 🔧 DIVE LOG STORAGE SYNC TEST
// Purpose: Test localStorage key consistency between Wix and Vercel

console.log('🔍 TESTING DIVE LOG STORAGE SYNC');
console.log('================================');

function testStorageKeys(userId) {
  console.log(`\n📝 Testing for userId: ${userId}`);
  
  // Test different key formats
  const keys = [
    `diveLogs_${userId}`,    // Correct format (underscore)
    `diveLogs-${userId}`,    // Wrong format (hyphen) 
    `savedDiveLogs_${userId}`, // Legacy format
    'diveLogs_session',       // Fallback
    'koval_ai_logs'          // Old format
  ];
  
  console.log('\n🔍 Checking localStorage keys:');
  keys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        console.log(`✅ ${key}: ${parsed.length} dive logs found`);
        if (parsed.length > 0) {
          console.log(`   Latest: ${parsed[0].timestamp || parsed[0].date || 'No timestamp'}`);
        }
      } catch (e) {
        console.log(`⚠️  ${key}: Invalid JSON data`);
      }
    } else {
      console.log(`❌ ${key}: No data found`);
    }
  });
  
  console.log('\n🧹 All localStorage keys:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.includes('dive') || key.includes('log')) {
      console.log(`   ${key}: ${localStorage.getItem(key).length} chars`);
    }
  }
}

// Test with different user scenarios
console.log('\n🧪 Testing different user scenarios:');
testStorageKeys('session-1755252836372'); // Guest session from your test
testStorageKeys('test-user'); // Backend test user
testStorageKeys('guest_1755253246'); // Generated guest ID

console.log('\n💡 EXPECTED BEHAVIOR:');
console.log('- Wix should save to: diveLogs_${userId}');
console.log('- Vercel should read from: diveLogs_${userId}');
console.log('- Same key = data persists across refresh');
console.log('- Different keys = data disappears');

console.log('\n🔧 IF ISSUES PERSIST:');
console.log('1. Check browser dev tools localStorage');
console.log('2. Verify Wix frontend uses diveLogs_ (underscore)');
console.log('3. Verify Vercel components use diveLogs_ (underscore)');
console.log('4. Test save -> refresh -> check data');
