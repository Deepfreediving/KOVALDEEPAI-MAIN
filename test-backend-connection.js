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

// Run tests (uncomment the line below to run)
// testAllEndpoints();

console.log("💡 To run tests, uncomment the last line and run this script in a browser console");
