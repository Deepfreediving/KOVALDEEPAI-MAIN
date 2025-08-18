// ===== 🧪 CORS TEST SCRIPT FOR WIX CONSOLE =====
// Copy-paste this into your Wix page browser console to test CORS connectivity
// After the Vercel deployment is complete (usually 2-3 minutes)

function testCORSFixed() {
    console.log('🧪 Testing CORS connectivity after fix...');
    console.log('====================================');
    
    const testData = {
        userId: 'cors-test-user',
        wixMemberId: null,
        sessionId: 'cors-test-session',
        timestamp: Date.now(),
        userAgent: 'CORS-Test-Browser'
    };
    
    console.log('📤 Sending test handshake request...');
    
    fetch('https://kovaldeepai-main.vercel.app/api/system/vercel-handshake', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
    })
    .then(function(response) {
        console.log('✅ CORS Test - Response received!');
        console.log('   - Status:', response.status);
        console.log('   - Status Text:', response.statusText);
        console.log('   - Headers:', [...response.headers.entries()]);
        
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Non-OK response: ' + response.status);
        }
    })
    .then(function(result) {
        console.log('🎉 SUCCESS! CORS is now working!');
        console.log('✅ Response data:', result);
        console.log('');
        console.log('🚀 NEXT STEPS:');
        console.log('   1. Refresh this page to enable full session management');
        console.log('   2. The widget should now connect to Vercel backend');
        console.log('   3. Premium features should be available');
        console.log('   4. Real-time sync should work');
        
        // Test if we're on the actual Wix page and can trigger a reload
        if (window.location.hostname === 'www.deepfreediving.com') {
            console.log('');
            console.log('⚡ Auto-refreshing page in 3 seconds to enable full functionality...');
            setTimeout(function() {
                window.location.reload();
            }, 3000);
        }
    })
    .catch(function(error) {
        console.error('❌ CORS Test failed:', error);
        console.log('');
        console.log('🔍 Possible reasons:');
        console.log('   1. Vercel deployment not complete yet (wait 2-3 minutes)');
        console.log('   2. Network connectivity issue');
        console.log('   3. Backend error (check Vercel logs)');
        console.log('');
        console.log('💡 Try running this test again in a few minutes');
    });
}

// Test preflight request specifically
function testPreflightRequest() {
    console.log('🔍 Testing OPTIONS preflight request...');
    
    fetch('https://kovaldeepai-main.vercel.app/api/system/vercel-handshake', {
        method: 'OPTIONS',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(function(response) {
        console.log('✅ Preflight Response:');
        console.log('   - Status:', response.status);
        console.log('   - Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
        console.log('   - Allow-Methods:', response.headers.get('Access-Control-Allow-Methods'));
        console.log('   - Allow-Headers:', response.headers.get('Access-Control-Allow-Headers'));
    })
    .catch(function(error) {
        console.error('❌ Preflight failed:', error);
    });
}

// Make functions globally available
if (typeof window !== 'undefined') {
    window.testCORSFixed = testCORSFixed;
    window.testPreflightRequest = testPreflightRequest;
}

console.log('🧪 CORS test functions loaded:');
console.log('   - testCORSFixed() - Test full CORS handshake');
console.log('   - testPreflightRequest() - Test OPTIONS preflight');
console.log('');
console.log('💡 Wait 2-3 minutes for Vercel deployment, then run: testCORSFixed()');
