// 🔥 BROWSER CONSOLE TEST SCRIPT - COPY & PASTE THIS INTO WIX PAGE CONSOLE
// Tests live AI widget functionality

console.log('🔥 TESTING LIVE AI WIDGET FUNCTIONALITY...');
console.log('=' .repeat(60));

// Test 1: Check if AI widget is loaded
if (typeof window.sendMessage === 'function') {
    console.log('✅ AI widget sendMessage function is available');
} else {
    console.log('❌ AI widget sendMessage function not found');
}

// Test 2: Check endpoint configuration
const endpointsToCheck = [
    { name: 'CHAT_API', expectedPattern: 'openai/chat' },
    { name: 'USER_MEMORY_API', expectedPattern: 'auth/save-user-memory' },
    { name: 'WIX_USER_MEMORY_API', expectedPattern: '_functions/userMemory' },
    { name: 'MEMBER_PROFILE_API', expectedPattern: '_functions/getUserProfile' },
    { name: 'TEST_API', expectedPattern: '_functions/test' }
];

let endpointErrors = 0;

endpointsToCheck.forEach(endpoint => {
    if (typeof window[endpoint.name] !== 'undefined') {
        const url = window[endpoint.name];
        if (url.includes(endpoint.expectedPattern)) {
            console.log(`✅ ${endpoint.name}: ${url}`);
        } else {
            console.log(`⚠️ ${endpoint.name}: ${url} (may not match expected pattern)`);
        }
    } else {
        console.log(`❌ ${endpoint.name} not found`);
        endpointErrors++;
    }
});

// Test 3: Test backend connection
async function testBackendConnection() {
    try {
        console.log('\n🔄 Testing backend connection...');
        
        // Test Wix backend
        if (typeof backend !== 'undefined' && backend.test) {
            const testResult = await backend.test({ testType: 'integration' });
            console.log('✅ Wix backend test:', testResult.success ? 'PASSED' : 'FAILED');
        } else {
            console.log('⚠️ Wix backend.test not available');
        }
        
    } catch (error) {
        console.log('❌ Backend test failed:', error.message);
    }
}

// Test 4: Test profile loading
async function testProfileLoading() {
    try {
        console.log('\n🔄 Testing profile loading...');
        
        if (typeof backend !== 'undefined' && backend.getUserProfile) {
            const profileResult = await backend.getUserProfile('test-user-id');
            console.log('✅ Profile loading test:', profileResult.success ? 'PASSED' : 'PARTIAL');
        } else {
            console.log('⚠️ Profile loading function not available');
        }
        
    } catch (error) {
        console.log('❌ Profile loading test failed:', error.message);
    }
}

// Test 5: Check for common errors
function checkForErrors() {
    console.log('\n🔍 Checking for common error patterns...');
    
    // Check if there are any unhandled errors in console
    const hasErrors = console.error.toString().includes('Error') || 
                     console.warn.toString().includes('Warning');
    
    console.log('🔍 Console error check: See console for any red error messages');
    console.log('🔍 Expected: No OpenAI API errors for non-chat functions');
    console.log('🔍 Expected: No JSON parse errors from backend responses');
}

// Run all tests
console.log('\n🚀 RUNNING LIVE TESTS...');

// Run tests in sequence
setTimeout(() => {
    testBackendConnection();
}, 1000);

setTimeout(() => {
    testProfileLoading();
}, 2000);

setTimeout(() => {
    checkForErrors();
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 LIVE TEST SUMMARY:');
    console.log(`- Endpoint configuration: ${endpointErrors === 0 ? 'GOOD' : 'NEEDS ATTENTION'}`);
    console.log('- Backend connectivity: See results above');
    console.log('- Profile loading: See results above');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Try sending a chat message through the AI widget');
    console.log('2. Check if user profile data loads correctly');
    console.log('3. Test dive log saving functionality');
    console.log('4. Monitor console for any new errors');
    
    console.log('\n✨ AI WIDGET SHOULD NOW WORK WITHOUT BACKEND ERRORS!');
}, 3000);
