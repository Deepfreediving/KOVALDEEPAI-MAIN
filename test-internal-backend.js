// 🧪 QUICK BACKEND TEST - Add this to your page code to test internal backend
// This tests if your backend functions work internally (not via HTTP)

import { test } from 'backend/test.jsw';

$w.onReady(function () {
    console.log('🧪 Testing internal backend connection...');
    
    // Test internal backend function
    test({ testType: 'internal', timestamp: new Date().toISOString() })
        .then(result => {
            console.log('✅ Internal backend test successful:', result);
        })
        .catch(error => {
            console.log('❌ Internal backend test failed:', error);
        });
});
