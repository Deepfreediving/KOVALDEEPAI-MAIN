/**
 * 🧪 KOVAL AI INTEGRATION TEST SCRIPT
 * Run this in your Wix page's browser console to test all functionality
 */

// ✅ TEST 1: Widget Detection
console.log("🧪 TEST 1: Widget Detection");
const possibleIds = ['#KovalAiWidget', '#kovalAIWidget', '#KovalAIWidget', '#htmlComponent1', '#html1', '#customElement1'];
let foundWidget = null;

for (const id of possibleIds) {
    try {
        const widget = $w(id);
        if (widget) {
            console.log(`✅ Found widget: ${id}`);
            foundWidget = widget;
            break;
        }
    } catch (e) {
        console.log(`⚠️ Widget ${id} not found`);
    }
}

if (!foundWidget) {
    console.error("❌ No widget found! Available elements:", Object.keys($w));
} else {
    console.log("✅ Widget detection successful!");
}

// ✅ TEST 2: Backend Connection
console.log("\n🧪 TEST 2: Backend Connection");
async function testBackendConnection() {
    const endpoints = [
        "https://www.deepfreediving.com/_functions/chat",
        "https://www.deepfreediving.com/_functions/http-userMemory", 
        "https://www.deepfreediving.com/_functions/http-diveLogs",
        "https://www.deepfreediving.com/_functions/http-loadMemories"
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ test: true })
            });
            console.log(`✅ ${endpoint}: ${response.status}`);
        } catch (error) {
            console.error(`❌ ${endpoint}: ${error.message}`);
        }
    }
}

// ✅ TEST 3: User Authentication
console.log("\n🧪 TEST 3: User Authentication");
import wixUsers from 'wix-users';

wixUsers.currentUser.getUser()
    .then(user => {
        if (user.loggedIn) {
            console.log(`✅ User logged in: ${user.id}`);
        } else {
            console.log("ℹ️ User is guest");
        }
    })
    .catch(error => {
        console.error("❌ Auth check failed:", error);
    });

// ✅ TEST 4: Data Collection Access
console.log("\n🧪 TEST 4: Data Collection Access");
import wixData from '@/wix-data-hooks';

wixData.query("@deepfreediving/kovaldeepai-app/Import1")
    .limit(1)
    .find()
    .then(results => {
        console.log(`✅ Collection accessible. Total items: ${results.totalCount}`);
    })
    .catch(error => {
        console.error("❌ Collection access failed:", error);
    });

// ✅ RUN ALL TESTS
testBackendConnection();

console.log("\n🎯 INTEGRATION TEST COMPLETE");
console.log("Check the logs above for any issues.");
