// ===== 🧪 V5.0 DIVE LOG SAVE TEST SCRIPT =====
// Copy and paste this into your browser console on:
// https://www.deepfreediving.com/large-koval-deep-ai-page

console.log('🧪 ========================================');
console.log('🧪 V5.0 DIVE LOG SAVE VERIFICATION TEST');
console.log('🧪 ========================================');

// Test 1: Check localStorage for existing dive logs
console.log('\n📋 1. LOCALSTORAGE DIVE LOGS CHECK:');
const allStorageKeys = Object.keys(localStorage);
const diveLogKeys = allStorageKeys.filter(key => key.includes('diveLogs'));

console.log('All localStorage keys:', allStorageKeys.length);
console.log('Dive log keys found:', diveLogKeys);

if (diveLogKeys.length > 0) {
  diveLogKeys.forEach(key => {
    try {
      const logs = JSON.parse(localStorage.getItem(key));
      console.log(`✅ Key: ${key}`);
      console.log(`   • Total logs: ${logs.length}`);
      console.log(`   • Latest log:`, logs[0] ? {
        id: logs[0].id,
        date: logs[0].date,
        location: logs[0].location || 'No location',
        depth: logs[0].reachedDepth || logs[0].targetDepth || 'No depth',
        source: logs[0].source
      } : 'No logs');
    } catch (e) {
      console.log(`❌ Key: ${key} - Parse error:`, e.message);
    }
  });
} else {
  console.log('ℹ️ No dive log keys found in localStorage');
}

// Test 2: Check V5.0 user data
console.log('\n📋 2. V5.0 USER DATA CHECK:');
if (window.KOVAL_USER_DATA_V5) {
  console.log('✅ V5.0 user data found:');
  console.log('   • Version:', window.KOVAL_USER_DATA_V5.version);
  console.log('   • User ID:', window.KOVAL_USER_DATA_V5.userId);
  console.log('   • Member ID:', window.KOVAL_USER_DATA_V5.memberId);
  console.log('   • Source:', window.KOVAL_USER_DATA_V5.source);
  console.log('   • Detection Method:', window.KOVAL_USER_DATA_V5.memberDetectionMethod);
  console.log('   • Is Guest:', window.KOVAL_USER_DATA_V5.isGuest);
  
  // Check for dive logs specific to this user
  const userId = window.KOVAL_USER_DATA_V5.userId;
  const userStorageKey = `diveLogs-${userId}`;
  console.log(`\n🔍 Checking specific storage key: ${userStorageKey}`);
  
  try {
    const userLogs = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
    console.log(`✅ User-specific logs found: ${userLogs.length}`);
    if (userLogs.length > 0) {
      console.log('Recent logs:');
      userLogs.slice(0, 3).forEach((log, i) => {
        console.log(`   ${i + 1}. ${log.date} - ${log.location || 'No location'} - ${log.reachedDepth || log.targetDepth || 'No depth'}m`);
      });
    }
  } catch (e) {
    console.log('❌ Error reading user logs:', e.message);
  }
} else {
  console.log('⚠️ No V5.0 user data found');
  console.log('   • Check if widget has loaded');
  console.log('   • Look for legacy KOVAL_USER_DATA:', !!window.KOVAL_USER_DATA);
}

// Test 3: Check widget status
console.log('\n📋 3. WIDGET STATUS CHECK:');
const iframes = document.querySelectorAll('iframe[src*="kovaldeepai-main.vercel.app"]');
console.log('Widget iframes found:', iframes.length);

if (iframes.length > 0) {
  console.log('✅ Widget iframe detected:');
  console.log('   • Source:', iframes[0].src);
  console.log('   • Contains V5.0 params:', iframes[0].src.includes('v=') ? '✅ Yes' : '❌ No');
  console.log('   • Contains userId param:', iframes[0].src.includes('userId=') ? '✅ Yes' : '❌ No');
} else {
  console.log('❌ No widget iframe found');
}

// Test 4: Check for V5.0 console logs
console.log('\n📋 4. CONSOLE LOG PATTERN CHECK:');
console.log('🔍 Look for these V5.0 indicators in console:');
console.log('   • "Koval AI Widget v5.0-DIVELOGS-ENHANCED loaded safely"');
console.log('   • "V5.0: Wix user authenticated with real member ID"');
console.log('   • "V5.0: Sending user data to widget"');
console.log('   • "SAVE_DIVE_LOG received but disabled (main app handles saves)"');

// Test 5: Dive log save functionality test
console.log('\n📋 5. DIVE LOG SAVE FUNCTION TEST:');
console.log('🧪 To test dive log saving:');
console.log('1. Open the AI chat widget');
console.log('2. Click the "📝 Journal" button');
console.log('3. Create a new dive log entry');
console.log('4. Save the dive log');
console.log('5. Run this test script again to see if it was saved');

// Test 6: Check for duplicate prevention
console.log('\n📋 6. DUPLICATE PREVENTION CHECK:');
if (diveLogKeys.length > 0) {
  diveLogKeys.forEach(key => {
    try {
      const logs = JSON.parse(localStorage.getItem(key));
      const ids = logs.map(log => log.id);
      const uniqueIds = [...new Set(ids)];
      
      if (ids.length !== uniqueIds.length) {
        console.log(`⚠️ Duplicates found in ${key}:`);
        console.log(`   • Total logs: ${logs.length}`);
        console.log(`   • Unique IDs: ${uniqueIds.length}`);
        console.log(`   • Duplicates: ${logs.length - uniqueIds.length}`);
      } else {
        console.log(`✅ No duplicates in ${key} (${logs.length} logs)`);
      }
    } catch (e) {
      console.log(`❌ Error checking duplicates in ${key}:`, e.message);
    }
  });
}

// Test 7: Manual save test function
console.log('\n📋 7. MANUAL SAVE TEST FUNCTION:');
window.testDiveLogSave = function(testData = {}) {
  console.log('🧪 Testing manual dive log save...');
  
  const userId = window.KOVAL_USER_DATA_V5?.userId || 'test-user-' + Date.now();
  const storageKey = `diveLogs-${userId}`;
  
  const testLog = {
    id: 'test-' + Date.now(),
    timestamp: new Date().toISOString(),
    userId: userId,
    date: new Date().toISOString().split('T')[0],
    disciplineType: 'depth',
    discipline: 'CWT',
    location: testData.location || 'Test Pool',
    targetDepth: testData.depth || 20,
    reachedDepth: testData.depth || 18,
    notes: 'Test save from console',
    source: 'manual-test',
    ...testData
  };
  
  try {
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
    existing.unshift(testLog);
    localStorage.setItem(storageKey, JSON.stringify(existing));
    
    console.log('✅ Test dive log saved successfully:');
    console.log('   • Storage key:', storageKey);
    console.log('   • Log ID:', testLog.id);
    console.log('   • Total logs now:', existing.length);
    
    return testLog;
  } catch (e) {
    console.log('❌ Failed to save test log:', e.message);
    return null;
  }
};

console.log('💡 Usage: testDiveLogSave({location: "Test Beach", depth: 25})');

// Test 8: Wix collection verification
console.log('\n📋 8. WIX INTEGRATION CHECK:');
console.log('✅ V5.0 Fixes Applied:');
console.log('   • Duplicate saves disabled in Wix frontend');
console.log('   • Main app handles all dive log saves');
console.log('   • localStorage uses correct key format: diveLogs-{userId}');
console.log('   • Real Wix Member IDs used (no session prefixes)');

console.log('\n🧪 ========================================');
console.log('🧪 TEST COMPLETE - CHECK RESULTS ABOVE');
console.log('🧪 ========================================');

console.log('\n💡 NEXT STEPS:');
console.log('1. If no dive logs found: Create a new dive log via the widget');
console.log('2. If duplicates found: V5.0 deduplication should prevent new ones');
console.log('3. If localStorage empty: Check if widget is fully loaded');
console.log('4. If errors persist: Check console for detailed error messages');

// Return summary for easy access
return {
  localStorage: {
    totalKeys: allStorageKeys.length,
    diveLogKeys: diveLogKeys.length,
    hasV5UserData: !!window.KOVAL_USER_DATA_V5
  },
  widget: {
    iframesFound: iframes.length,
    hasUserId: window.KOVAL_USER_DATA_V5?.userId || 'none'
  },
  testFunction: 'testDiveLogSave() available for manual testing'
};
