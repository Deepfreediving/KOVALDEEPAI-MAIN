// 🔍 ENDPOINT VERIFICATION SCRIPT - WIX FRONTEND PAGE
// Copy and paste this into your Wix page console to verify all endpoints are correct

console.log('🔍 VERIFYING WIX FRONTEND PAGE ENDPOINTS...');
console.log('=' .repeat(60));

// Check all endpoint constants
const endpointsToCheck = [
    'WIX_CONNECTION_API',
    'MEMBER_PROFILE_API', 
    'TEST_API',
    'WIX_CHAT_API',
    'WIX_USER_MEMORY_API',
    'WIX_GET_USER_PROFILE_API',
    'USER_MEMORY_API',
    'LOAD_MEMORIES_API',
    'GET_USER_MEMORY_API',
    'SAVE_TO_USER_MEMORY_API'
];

let correctCount = 0;
let totalCount = 0;

endpointsToCheck.forEach(endpointName => {
    totalCount++;
    
    if (typeof window[endpointName] !== 'undefined') {
        const url = window[endpointName];
        
        // Check if non-chat endpoints incorrectly point to OpenAI chat
        const isChat = endpointName.includes('CHAT');
        const pointsToOpenAIChat = url.includes('openai/chat');
        
        if (!isChat && pointsToOpenAIChat) {
            console.error(`❌ ${endpointName} incorrectly points to OpenAI chat: ${url}`);
        } else if (isChat && !pointsToOpenAIChat) {
            console.warn(`⚠️ ${endpointName} doesn't point to OpenAI chat: ${url}`);
        } else {
            console.log(`✅ ${endpointName}: ${url}`);
            correctCount++;
        }
    } else {
        console.error(`❌ ${endpointName} not found`);
    }
});

console.log('=' .repeat(60));
console.log(`📊 ENDPOINT VERIFICATION RESULTS: ${correctCount}/${totalCount} correct`);

if (correctCount === totalCount) {
    console.log('🎉 ALL ENDPOINTS CORRECTLY CONFIGURED!');
    console.log('✅ Your OpenAI errors should now be resolved!');
} else {
    console.log('⚠️ Some endpoints still need fixing');
}

// Test basic functionality
console.log('\n🧪 TESTING BASIC FUNCTIONALITY...');

// Test user data loading
try {
    if (typeof loadComprehensiveUserData === 'function') {
        loadComprehensiveUserData().then(userData => {
            console.log('✅ User data loading works:', userData.userId);
        }).catch(error => {
            console.log('⚠️ User data loading issue:', error.message);
        });
    } else {
        console.log('⚠️ loadComprehensiveUserData function not found');
    }
} catch (error) {
    console.log('❌ Error testing user data loading:', error.message);
}

// Test widget setup
try {
    const possibleIds = ['#koval-ai', '#KovalAiWidget', '#kovalAIWidget', '#KovalAIWidget', '#htmlComponent1', '#html1', '#customElement1'];
    let widgetFound = false;
    
    for (const id of possibleIds) {
        try {
            const widget = $w(id);
            if (widget) {
                console.log(`✅ Widget found: ${id}`);
                widgetFound = true;
                break;
            }
        } catch (e) {
            // Continue searching
        }
    }
    
    if (!widgetFound) {
        console.log('⚠️ No widget found with expected IDs');
    }
} catch (error) {
    console.log('❌ Error testing widget:', error.message);
}

console.log('\n💡 IF YOU STILL GET OPENAI ERRORS:');
console.log('1. Clear browser cache and refresh the page');
console.log('2. Check browser console for specific error messages');
console.log('3. Verify your Next.js endpoints are working:');
console.log('   - https://kovaldeepai-main.vercel.app/api/openai/chat (for chat only)');
console.log('   - https://kovaldeepai-main.vercel.app/api/auth/save-user-memory');
console.log('   - https://kovaldeepai-main.vercel.app/api/auth/get-user-memory');
