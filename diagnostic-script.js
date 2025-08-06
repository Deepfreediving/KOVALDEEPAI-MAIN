// 🔍 KOVAL AI DIAGNOSTIC SCRIPT
// Run this in your browser console to diagnose issues

console.log("🔍 KOVAL AI DIAGNOSTIC STARTING...");

// ✅ 1. Check Available Elements
console.log("\n1️⃣ AVAILABLE PAGE ELEMENTS:");
console.log("Available $w elements:", Object.keys($w));

// ✅ 2. Widget Detection
console.log("\n2️⃣ WIDGET DETECTION:");
const widgetIds = ['#koval-ai', '#KovalAiWidget', '#kovalAIWidget', '#KovalAIWidget', '#htmlComponent1', '#html1'];
let foundWidget = null;

widgetIds.forEach(id => {
    try {
        const widget = $w(id);
        if (widget) {
            console.log(`✅ Found widget: ${id}`, widget);
            foundWidget = widget;
        }
    } catch (e) {
        console.log(`❌ ${id} not found`);
    }
});

// ✅ 3. User Authentication
console.log("\n3️⃣ USER AUTHENTICATION:");
import wixUsers from 'wix-users';

try {
    console.log("User logged in:", wixUsers.currentUser.loggedIn);
    if (wixUsers.currentUser.loggedIn) {
        console.log("User ID:", wixUsers.currentUser.id);
        console.log("User email:", wixUsers.currentUser.loginEmail);
    }
} catch (authError) {
    console.error("❌ Auth check failed:", authError);
}

// ✅ 4. API Endpoint Testing
console.log("\n4️⃣ API ENDPOINT TESTING:");

async function testEndpoint(url, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) options.body = JSON.stringify(body);
        
        const response = await fetch(url, options);
        console.log(`${method} ${url}: ${response.status} ${response.statusText}`);
        return response.status;
    } catch (error) {
        console.error(`${method} ${url}: ❌ ${error.message}`);
        return 0;
    }
}

// Test endpoints
testEndpoint('https://www.deepfreediving.com/_functions/testConnection');
testEndpoint('https://www.deepfreediving.com/_functions/chat', 'POST', { userMessage: 'test' });
testEndpoint('https://www.deepfreediving.com/_functions/http-userMemory?userId=test&limit=1');
testEndpoint('https://kovaldeepai-main.vercel.app/api/chat-embed', 'POST', { message: 'test' });

// ✅ 5. Console Errors
console.log("\n5️⃣ CHECK BROWSER CONSOLE:");
console.log("Look for any red error messages above this diagnostic.");

// ✅ 6. Widget Properties
if (foundWidget) {
    console.log("\n6️⃣ WIDGET PROPERTIES:");
    try {
        console.log("Widget type:", foundWidget.type);
        console.log("Widget ID:", foundWidget.id);
        console.log("Has postMessage?", typeof foundWidget.postMessage === 'function');
        console.log("Has onMessage?", typeof foundWidget.onMessage === 'function');
        console.log("Has html property?", 'html' in foundWidget);
    } catch (propError) {
        console.error("❌ Widget property check failed:", propError);
    }
}

// ✅ 7. Network Tab Check
console.log("\n7️⃣ NETWORK TAB:");
console.log("Check the Network tab in DevTools for failed requests (red entries)");

console.log("\n🎯 DIAGNOSTIC COMPLETE");
console.log("Copy this output and any error messages to help debug the issue.");
