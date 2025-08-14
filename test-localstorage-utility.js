/**
 * 🧪 BROWSER LOCALSTORAGE TEST UTILITY
 * 
 * Paste this into your browser console on the live Wix site
 * to test localStorage functionality and debug any save issues.
 */

function testLocalStorageForDiveLogs() {
    console.log('🧪 TESTING LOCALSTORAGE FOR DIVE LOGS');
    console.log('=====================================');
    
    // Test 1: Check browser localStorage support
    console.log('\n1. 📊 BROWSER SUPPORT TEST:');
    const storageSupported = typeof(Storage) !== "undefined";
    console.log('   • localStorage supported:', storageSupported ? '✅ Yes' : '❌ No');
    
    if (!storageSupported) {
        console.log('❌ localStorage not supported in this browser');
        return;
    }
    
    // Test 2: Check current user ID
    console.log('\n2. 🆔 USER ID TEST:');
    const userId = window.wixUserId || window.KOVAL_USER_DATA_V5?.userId || 'test-user';
    console.log('   • Current user ID:', userId);
    console.log('   • Is real member ID:', !userId.startsWith('session-') && !userId.startsWith('guest-') ? '✅ Yes' : '❌ No (session/guest ID)');
    
    // Test 3: Check storage key
    console.log('\n3. 🔑 STORAGE KEY TEST:');
    const storageKey = `diveLogs-${userId}`;
    console.log('   • Storage key:', storageKey);
    
    // Test 4: Check existing data
    console.log('\n4. 📋 EXISTING DATA TEST:');
    try {
        const existingData = localStorage.getItem(storageKey);
        if (existingData) {
            const logs = JSON.parse(existingData);
            console.log('   • Existing logs found:', logs.length);
            console.log('   • Latest log:', logs[0] ? {
                id: logs[0].id,
                date: logs[0].date,
                location: logs[0].location,
                depth: logs[0].reachedDepth || logs[0].targetDepth
            } : 'None');
        } else {
            console.log('   • No existing logs found');
        }
    } catch (e) {
        console.log('   • Error reading existing data:', e.message);
    }
    
    // Test 5: Test write capability
    console.log('\n5. ✍️ WRITE TEST:');
    const testLog = {
        id: 'test-' + Date.now(),
        timestamp: new Date().toISOString(),
        userId: userId,
        date: new Date().toISOString().split('T')[0],
        discipline: 'Test Dive',
        location: 'Test Location',
        targetDepth: 20,
        reachedDepth: 18,
        notes: 'This is a test dive log to verify localStorage functionality'
    };
    
    try {
        // Get existing logs
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updated = [testLog, ...existing];
        
        // Save updated logs
        localStorage.setItem(storageKey, JSON.stringify(updated));
        console.log('   • Test write successful ✅');
        
        // Verify the write
        const verified = localStorage.getItem(storageKey);
        if (verified) {
            const verifiedLogs = JSON.parse(verified);
            console.log('   • Verification successful ✅');
            console.log('   • Total logs after test:', verifiedLogs.length);
        } else {
            console.log('   • Verification failed ❌');
        }
        
    } catch (e) {
        console.log('   • Write test failed ❌:', e.message);
    }
    
    // Test 6: Storage quota check
    console.log('\n6. 💾 STORAGE QUOTA TEST:');
    try {
        const testData = 'x'.repeat(1024 * 1024); // 1MB test
        localStorage.setItem('quota-test', testData);
        localStorage.removeItem('quota-test');
        console.log('   • Large data write test: ✅ Passed (>1MB available)');
    } catch (e) {
        console.log('   • Storage quota issue:', e.message);
    }
    
    // Test 7: Check all dive log storage keys
    console.log('\n7. 🔍 ALL DIVE LOG KEYS:');
    const allKeys = Object.keys(localStorage).filter(key => key.startsWith('diveLogs-'));
    console.log('   • Found dive log keys:', allKeys.length);
    allKeys.forEach(key => {
        try {
            const data = localStorage.getItem(key);
            const logs = JSON.parse(data || '[]');
            console.log(`   • ${key}: ${logs.length} logs`);
        } catch (e) {
            console.log(`   • ${key}: Invalid data`);
        }
    });
    
    console.log('\n📋 SUMMARY:');
    console.log('===========');
    console.log('✅ Run this test after creating a dive log to verify saves');
    console.log('✅ Check the console for any "localStorage verification" messages');
    console.log('✅ Real member ID should NOT start with "session-" or "guest-"');
    console.log('✅ Storage key should use your actual Wix member ID');
    
    return {
        storageSupported,
        userId,
        storageKey,
        testCompleted: true
    };
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
    console.log('🎯 Dive Logs localStorage Test Utility Loaded');
    console.log('📞 Call testLocalStorageForDiveLogs() to run tests');
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testLocalStorageForDiveLogs };
}
