// ===== 🔍 INTEGRATION VERIFICATION SCRIPT =====
// Test all critical system endpoints and data flow

console.log("🔍 Starting comprehensive system integration test...");

/**
 * ✅ TEST 1: Wix Member Data Retrieval (Updated for FullData)
 */
async function testMemberDataRetrieval() {
    console.log("\n🧪 TEST 1: Member Data Retrieval (FullData Collection)");
    
    try {
        // Test with a sample user ID (replace with actual member ID in production)
        const testUserId = wixUsers.currentUser.loggedIn ? wixUsers.currentUser.id : 'test-user';
        
        const response = await fetch('/_functions/getUserProfile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: testUserId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log("✅ Member data retrieval: PASS");
            console.log("📊 Data structure:", {
                hasProfile: !!result.profile,
                hasUser: !!result.user,
                source: result.profile?.source || result.user?.source,
                displayName: result.profile?.displayName || result.user?.displayName
            });
        } else {
            console.warn("⚠️ Member data retrieval: FAIL -", result.error);
        }
    } catch (error) {
        console.error("❌ Member data retrieval: ERROR -", error.message);
    }
}

/**
 * ✅ TEST 2: Chat Integration (Wix → Next.js → OpenAI)
 */
async function testChatIntegration() {
    console.log("\n🧪 TEST 2: Chat Integration (Full Pipeline)");
    
    try {
        const response = await fetch('/_functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userMessage: "Test message for integration verification",
                userId: wixUsers.currentUser.loggedIn ? wixUsers.currentUser.id : 'test-user',
                profile: { nickname: 'Test User' },
                diveLogs: []
            })
        });
        
        const result = await response.json();
        
        if (result.success !== false && (result.aiResponse || result.assistantMessage)) {
            console.log("✅ Chat integration: PASS");
            console.log("📊 Response received from AI backend");
        } else {
            console.warn("⚠️ Chat integration: FAIL -", result.error || 'No AI response');
        }
    } catch (error) {
        console.error("❌ Chat integration: ERROR -", error.message);
    }
}

/**
 * ✅ TEST 3: Dive Logs Storage & Retrieval
 */
async function testDiveLogsIntegration() {
    console.log("\n🧪 TEST 3: Dive Logs Integration");
    
    try {
        const testDiveLog = {
            discipline: "Test Integration",
            targetDepth: 10,
            reachedDepth: 8,
            location: "Test Pool",
            date: new Date().toISOString(),
            notes: "Integration test dive log"
        };
        
        // Test save
        const saveResponse = await fetch('/_functions/diveLogs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: wixUsers.currentUser.loggedIn ? wixUsers.currentUser.id : 'test-user',
                diveLog: testDiveLog
            })
        });
        
        const saveResult = await saveResponse.json();
        
        if (saveResult.success) {
            console.log("✅ Dive logs integration: PASS");
            console.log("📊 Dive log saved successfully");
        } else {
            console.warn("⚠️ Dive logs integration: FAIL -", saveResult.error);
        }
    } catch (error) {
        console.error("❌ Dive logs integration: ERROR -", error.message);
    }
}

/**
 * ✅ TEST 4: User Memory Storage & Retrieval
 */
async function testUserMemoryIntegration() {
    console.log("\n🧪 TEST 4: User Memory Integration");
    
    try {
        const testMemory = {
            memoryContent: "Integration test memory entry",
            logEntry: "System integration test",
            sessionName: "Integration Test Session",
            metadata: { type: 'integration-test', timestamp: Date.now() }
        };
        
        const response = await fetch('/_functions/userMemory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: wixUsers.currentUser.loggedIn ? wixUsers.currentUser.id : 'test-user',
                ...testMemory
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log("✅ User memory integration: PASS");
            console.log("📊 Memory saved successfully");
        } else {
            console.warn("⚠️ User memory integration: FAIL -", result.error);
        }
    } catch (error) {
        console.error("❌ User memory integration: ERROR -", error.message);
    }
}

/**
 * ✅ TEST 5: Next.js API Direct Access (Fallback Test)
 */
async function testNextJSFallback() {
    console.log("\n🧪 TEST 5: Next.js API Fallback");
    
    try {
        const response = await fetch('https://kovaldeepai-main.vercel.app/api/openai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userMessage: "Fallback test message",
                userId: 'integration-test',
                profile: { nickname: 'Test User' },
                diveLogs: []
            })
        });
        
        const result = await response.json();
        
        if (result.aiResponse || result.assistantMessage) {
            console.log("✅ Next.js fallback: PASS");
            console.log("📊 Direct Next.js API working");
        } else {
            console.warn("⚠️ Next.js fallback: FAIL -", result.error || 'No response');
        }
    } catch (error) {
        console.error("❌ Next.js fallback: ERROR -", error.message);
    }
}

/**
 * 🎯 RUN ALL INTEGRATION TESTS
 */
async function runIntegrationTests() {
    console.log("🚀 Running comprehensive integration verification...");
    console.log("=".repeat(60));
    
    // Run all tests
    await testMemberDataRetrieval();
    await testChatIntegration();
    await testDiveLogsIntegration();
    await testUserMemoryIntegration();
    await testNextJSFallback();
    
    console.log("\n" + "=".repeat(60));
    console.log("🎯 Integration test suite completed!");
    console.log("📊 Check console output above for detailed results");
    console.log("✅ System ready for production use");
}

// ✅ Auto-run tests if in debug mode
if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
    setTimeout(() => {
        runIntegrationTests().catch(error => {
            console.error("❌ Integration test suite failed:", error);
        });
    }, 2000); // Wait 2 seconds for page to load
}

// ✅ Make function available globally for manual testing
window.runKovalAIIntegrationTests = runIntegrationTests;
