// ===== 🚀 LIVE SITE VERIFICATION SCRIPT =====
// Copy and paste this into your browser console on:
// https://www.deepfreediving.com/large-koval-deep-ai-page

console.log('🚀 ========================================');
console.log('🚀 LIVE SITE V5.0 VERIFICATION');
console.log('🚀 ========================================');

// Quick verification of all V5.0 fixes
const verification = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function checkResult(test, condition, message, isWarning = false) {
  const status = condition ? '✅' : (isWarning ? '⚠️' : '❌');
  console.log(`${status} ${test}: ${message}`);
  
  if (condition) verification.passed++;
  else if (isWarning) verification.warnings++;
  else verification.failed++;
  
  return condition;
}

console.log('\n🔍 CHECKING V5.0 FIXES...\n');

// 1. Check V5.0 User Data
const hasV5UserData = !!window.KOVAL_USER_DATA_V5;
checkResult('V5.0 User Data', hasV5UserData, 
  hasV5UserData ? 
    `Found with userId: ${window.KOVAL_USER_DATA_V5.userId}` : 
    'Not found - widget may still be loading'
);

if (hasV5UserData) {
  const userData = window.KOVAL_USER_DATA_V5;
  checkResult('Real Member ID', !userData.userId.startsWith('session-'), 
    userData.userId.startsWith('session-') ? 
      'Still using session ID - not real member ID' : 
      `Using real member ID: ${userData.memberId || userData.userId}`
  );
  
  checkResult('V5.0 Version', userData.version === 'v5.0-DIVELOGS-ENHANCED',
    `Version: ${userData.version || 'unknown'}`
  );
}

// 2. Check localStorage dive logs
const diveLogKeys = Object.keys(localStorage).filter(key => key.includes('diveLogs'));
checkResult('LocalStorage Keys', diveLogKeys.length > 0,
  diveLogKeys.length > 0 ? 
    `Found ${diveLogKeys.length} dive log storage keys` : 
    'No dive log storage found'
);

// 3. Check for duplicates in storage
let hasDuplicates = false;
if (diveLogKeys.length > 0) {
  diveLogKeys.forEach(key => {
    try {
      const logs = JSON.parse(localStorage.getItem(key));
      const ids = logs.map(log => log.id);
      const uniqueIds = [...new Set(ids)];
      if (ids.length !== uniqueIds.length) {
        hasDuplicates = true;
        console.log(`⚠️ Duplicates in ${key}: ${logs.length - uniqueIds.length} duplicates`);
      }
    } catch (e) {
      console.log(`❌ Error reading ${key}:`, e.message);
    }
  });
}

checkResult('No Duplicates', !hasDuplicates,
  hasDuplicates ? 'Duplicates found in storage' : 'No duplicates detected'
);

// 4. Check widget iframe
const iframes = document.querySelectorAll('iframe[src*="kovaldeepai-main.vercel.app"]');
checkResult('Widget Iframe', iframes.length > 0,
  iframes.length > 0 ? 
    `Found ${iframes.length} widget iframe(s)` : 
    'No widget iframe detected'
);

// 5. Check console for V5.0 indicators
console.log('\n📋 CONSOLE INDICATORS TO LOOK FOR:');
const v5Indicators = [
  'Koval AI Widget v5.0-DIVELOGS-ENHANCED loaded safely',
  'V5.0: Wix user authenticated with real member ID',
  'V5.0: Sending user data to widget',
  'SAVE_DIVE_LOG received but disabled',
  'createV5FallbackUserData'
];

v5Indicators.forEach(indicator => {
  console.log(`🔍 "${indicator}"`);
});

// 6. Test dive log functionality
console.log('\n🧪 DIVE LOG FUNCTIONALITY TEST:');

window.quickDiveLogTest = function() {
  console.log('\n🧪 Running quick dive log test...');
  
  if (!window.KOVAL_USER_DATA_V5) {
    console.log('❌ Cannot test: No V5.0 user data available');
    return false;
  }
  
  const userId = window.KOVAL_USER_DATA_V5.userId;
  const storageKey = `diveLogs-${userId}`;
  
  // Get current count
  const beforeLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const beforeCount = beforeLogs.length;
  
  // Create test log
  const testLog = {
    id: 'verification-test-' + Date.now(),
    timestamp: new Date().toISOString(),
    userId: userId,
    date: new Date().toISOString().split('T')[0],
    disciplineType: 'depth',
    discipline: 'CNF',
    location: 'Test Verification Pool',
    targetDepth: 15,
    reachedDepth: 15,
    notes: 'V5.0 verification test log',
    source: 'verification-test'
  };
  
  try {
    // Save test log
    const updatedLogs = [testLog, ...beforeLogs];
    localStorage.setItem(storageKey, JSON.stringify(updatedLogs));
    
    // Verify save
    const afterLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const success = afterLogs.length === beforeCount + 1;
    
    console.log(success ? '✅' : '❌', `Save test: ${beforeCount} → ${afterLogs.length} logs`);
    
    if (success) {
      // Clean up test log
      const cleanedLogs = afterLogs.filter(log => log.id !== testLog.id);
      localStorage.setItem(storageKey, JSON.stringify(cleanedLogs));
      console.log('🧹 Test log cleaned up');
    }
    
    return success;
  } catch (e) {
    console.log('❌ Save test failed:', e.message);
    return false;
  }
};

// 7. Generate summary
console.log('\n📊 VERIFICATION SUMMARY:');
console.log(`✅ Passed: ${verification.passed}`);
console.log(`⚠️ Warnings: ${verification.warnings}`);
console.log(`❌ Failed: ${verification.failed}`);

const overallStatus = verification.failed === 0 ? 
  (verification.warnings === 0 ? 'EXCELLENT' : 'GOOD') : 'NEEDS ATTENTION';

console.log(`\n🎯 OVERALL STATUS: ${overallStatus}`);

if (verification.failed > 0) {
  console.log('\n🔧 RECOMMENDED ACTIONS:');
  console.log('1. Check if widget has fully loaded');
  console.log('2. Verify you are logged into Wix');
  console.log('3. Try refreshing the page');
  console.log('4. Check browser console for error messages');
}

console.log('\n💡 QUICK TESTS AVAILABLE:');
console.log('• quickDiveLogTest() - Test localStorage save/load');
console.log('• testDiveLogSave() - Create manual test dive log');

console.log('\n🚀 ========================================');
console.log('🚀 VERIFICATION COMPLETE');
console.log('🚀 ========================================');

return {
  status: overallStatus,
  results: verification,
  hasV5UserData,
  diveLogKeys: diveLogKeys.length,
  quickTest: 'quickDiveLogTest()'
};
