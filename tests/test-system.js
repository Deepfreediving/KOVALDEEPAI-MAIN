// ===== 📄 test-system.js - COMPREHENSIVE SYSTEM TESTING =====
// Use this script to test all your backend endpoints and frontend integration

(function () {
  "use strict";

  const TEST_CONFIG = {
    baseUrl: "https://www.deepfreediving.com",
    endpoints: {
      wixConnection: "/_functions/wixConnection",
      chat: "/_functions/chat",
      userMemory: "/_functions/userMemory",
      getUserProfile: "/_functions/getUserProfile",
      diveLogs: "/_functions/diveLogs",
      loadMemories: "/_functions/loadMemories",
    },
  };

  console.log("🧪 Starting Koval AI System Tests...");

  // ✅ Test 1: Backend Connection
  async function testBackendConnection() {
    console.log("\n🔍 Testing backend connection...");
    try {
      const response = await fetch(
        TEST_CONFIG.baseUrl + TEST_CONFIG.endpoints.wixConnection,
      );
      const data = await response.json();

      if (data.success) {
        console.log("✅ Backend connection: PASS");
        console.log("📊 Services:", data.services);
        return true;
      } else {
        console.log("❌ Backend connection: FAIL");
        console.log("Error:", data.error);
        return false;
      }
    } catch (error) {
      console.log("❌ Backend connection: ERROR");
      console.log("Error:", error.message);
      return false;
    }
  }

  // ✅ Test 2: User Authentication
  async function testUserAuthentication() {
    console.log("\n👤 Testing user authentication...");
    try {
      // Check if wixUsers is available
      if (typeof window !== "undefined" && window.wixUsers) {
        const currentUser = window.wixUsers.currentUser;
        if (currentUser && currentUser.loggedIn) {
          console.log("✅ User authentication: AUTHENTICATED");
          console.log("👤 User ID:", currentUser.id);
          console.log("📧 User Email:", currentUser.loginEmail);
          return { authenticated: true, userId: currentUser.id };
        } else {
          console.log("⚠️ User authentication: NOT LOGGED IN");
          return { authenticated: false, userId: "guest-" + Date.now() };
        }
      } else {
        console.log("❌ User authentication: WIX USERS API NOT AVAILABLE");
        return { authenticated: false, userId: "test-user" };
      }
    } catch (error) {
      console.log("❌ User authentication: ERROR");
      console.log("Error:", error.message);
      return { authenticated: false, userId: "error-user" };
    }
  }

  // ✅ Test 3: Chat Endpoint
  async function testChatEndpoint(userId) {
    console.log("\n💬 Testing chat endpoint...");
    try {
      const response = await fetch(
        TEST_CONFIG.baseUrl + TEST_CONFIG.endpoints.chat,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            userMessage:
              "Hello, this is a test message. Can you help me with freediving?",
            userId: userId,
            profile: { nickname: "Test User", totalDives: 5 },
          }),
        },
      );

      const data = await response.json();

      if (response.ok && data.aiResponse) {
        console.log("✅ Chat endpoint: PASS");
        console.log(
          "🤖 AI Response:",
          data.aiResponse.substring(0, 100) + "...",
        );
        return true;
      } else {
        console.log("❌ Chat endpoint: FAIL");
        console.log("Error:", data.error);
        return false;
      }
    } catch (error) {
      console.log("❌ Chat endpoint: ERROR");
      console.log("Error:", error.message);
      return false;
    }
  }

  // ✅ Test 4: User Memory Endpoint
  async function testUserMemoryEndpoint(userId) {
    console.log("\n🧠 Testing user memory endpoint...");
    try {
      // Test GET
      const getResponse = await fetch(
        `${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoints.userMemory}?userId=${userId}&limit=5`,
        { credentials: "include" },
      );
      const getData = await getResponse.json();

      if (getResponse.ok) {
        console.log("✅ User memory GET: PASS");
        console.log("📊 Found", getData.count || 0, "memory entries");
      } else {
        console.log("❌ User memory GET: FAIL");
        console.log("Error:", getData.error);
      }

      // Test POST
      const postResponse = await fetch(
        TEST_CONFIG.baseUrl + TEST_CONFIG.endpoints.userMemory,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            userId: userId,
            memoryContent: "Test memory entry from system test",
            logEntry: "System test log",
            sessionName: "Test Session",
            timestamp: new Date().toISOString(),
          }),
        },
      );

      const postData = await postResponse.json();

      if (postResponse.ok && postData.success) {
        console.log("✅ User memory POST: PASS");
        return true;
      } else {
        console.log("❌ User memory POST: FAIL");
        console.log("Error:", postData.error);
        return false;
      }
    } catch (error) {
      console.log("❌ User memory endpoint: ERROR");
      console.log("Error:", error.message);
      return false;
    }
  }

  // ✅ Test 5: Widget Loading
  async function testWidgetLoading() {
    console.log("\n🎛️ Testing widget loading...");
    try {
      // Check if Koval AI widget elements exist
      const widgetElements = ["#koval-ai", "#KovalAIFrame", "#kovalAIWidget"];
      let foundWidget = null;

      for (const selector of widgetElements) {
        try {
          const element = document.querySelector(selector) || $w(selector);
          if (element) {
            foundWidget = selector;
            break;
          }
        } catch (e) {
          // Continue checking
        }
      }

      if (foundWidget) {
        console.log("✅ Widget loading: WIDGET FOUND");
        console.log("🎯 Widget selector:", foundWidget);
        return true;
      } else {
        console.log("⚠️ Widget loading: NO WIDGET FOUND");
        console.log("📋 Searched for:", widgetElements.join(", "));
        return false;
      }
    } catch (error) {
      console.log("❌ Widget loading: ERROR");
      console.log("Error:", error.message);
      return false;
    }
  }

  // ✅ Run All Tests
  async function runAllTests() {
    console.log("🚀 Running comprehensive system tests...");

    const results = {
      backendConnection: await testBackendConnection(),
      userAuth: await testUserAuthentication(),
      widgetLoading: await testWidgetLoading(),
    };

    const userId = results.userAuth.userId || "test-user";

    results.chatEndpoint = await testChatEndpoint(userId);
    results.userMemoryEndpoint = await testUserMemoryEndpoint(userId);

    // ✅ Summary
    console.log("\n📋 TEST SUMMARY");
    console.log("================");
    console.log(
      "Backend Connection:",
      results.backendConnection ? "✅ PASS" : "❌ FAIL",
    );
    console.log(
      "User Authentication:",
      results.userAuth.authenticated ? "✅ AUTHENTICATED" : "⚠️ GUEST",
    );
    console.log(
      "Widget Loading:",
      results.widgetLoading ? "✅ PASS" : "⚠️ NO WIDGET",
    );
    console.log("Chat Endpoint:", results.chatEndpoint ? "✅ PASS" : "❌ FAIL");
    console.log(
      "User Memory:",
      results.userMemoryEndpoint ? "✅ PASS" : "❌ FAIL",
    );

    const passCount = Object.values(results).filter(
      (r) => r === true || r?.authenticated,
    ).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n🎯 Overall: ${passCount}/${totalTests} tests passed`);

    if (passCount === totalTests) {
      console.log("🎉 All systems operational!");
    } else {
      console.log("⚠️ Some issues detected. Check logs above.");
    }

    return results;
  }

  // ✅ Auto-run tests or expose for manual execution
  if (typeof window !== "undefined") {
    window.KovalAITests = {
      runAllTests,
      testBackendConnection,
      testUserAuthentication,
      testChatEndpoint,
      testUserMemoryEndpoint,
      testWidgetLoading,
    };

    // Auto-run if URL contains test parameter
    if (window.location.search.includes("runTests=true")) {
      setTimeout(runAllTests, 2000); // Wait for page to fully load
    }
  }

  console.log(
    "✅ Test system loaded. Run window.KovalAITests.runAllTests() to start testing.",
  );
})();
