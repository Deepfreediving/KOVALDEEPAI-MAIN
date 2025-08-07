// ===== 📄 test-backend-connection.js =====
// Test script to verify all backend endpoints are working

// Test URLs (adjust to match your Wix site)
const BASE_URL = "https://www.deepfreediving.com";

const endpoints = [
    "/_functions/wixConnection",
    "/_functions/chat", 
    "/_functions/userMemory",
    "/_functions/diveLogs",
    "/_functions/loadMemories",
    "/_functions/getUserMemory",
    "/_functions/saveToUserMemory"
];

async function testEndpoint(url) {
    try {
        console.log(`🔍 Testing: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`  Status: ${response.status}`);
        
        if (response.ok) {
            const text = await response.text();
            console.log(`  ✅ Success: ${text.substring(0, 100)}...`);
        } else {
            console.log(`  ❌ Failed: ${response.statusText}`);
        }
        
    } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
}

async function testAllEndpoints() {
    console.log("🚀 Testing Wix Backend Endpoints\n");
    
    for (const endpoint of endpoints) {
        await testEndpoint(BASE_URL + endpoint);
    }
    
    console.log("✅ All tests completed");
}

// Run tests (comment out to avoid auto-running)
// testAllEndpoints();

// ✅ SIMPLE COMMUNICATION TEST
function testWidgetCommunication() {
    console.log("� Testing widget communication...");
    
    // Find widget iframe
    const widget = document.querySelector('koval-ai');
    if (widget) {
        console.log('✅ Found widget:', widget);
        
        // Test sending message to widget
        try {
            const testMessage = {
                type: 'USER_DATA_RESPONSE',
                userData: {
                    userId: 'test-user-123',
                    profile: { displayName: 'Test User' }
                }
            };
            
            widget.contentWindow?.postMessage(testMessage, '*');
            console.log('📤 Sent test message to widget');
        } catch (error) {
            console.error('❌ Failed to send test message:', error);
        }
    } else {
        console.log('❌ Widget not found');
        console.log('🔍 Available elements:', document.querySelectorAll('*'));
    }
}

console.log("💡 Run testWidgetCommunication() in console to test widget communication");
