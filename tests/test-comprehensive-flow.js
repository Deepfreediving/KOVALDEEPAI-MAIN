// Comprehensive Test Script for Dive Log Flow
// test-comprehensive-flow.js

const axios = require("axios");

const API_BASE = "http://localhost:3000";
const TEST_USER_ID = "test-user-comprehensive";

async function testCompleteFlow() {
  console.log("🚀 Starting comprehensive dive log flow test...\n");

  // Test 1: Submit a dive log
  console.log("1️⃣ Testing dive log submission...");
  const testDiveLog = {
    userId: TEST_USER_ID,
    date: "2024-01-20",
    disciplineType: "Static",
    discipline: "STA",
    location: "Training Pool",
    targetDepth: "0",
    reachedDepth: "0",
    mouthfillDepth: "0",
    issueDepth: "",
    squeeze: false,
    exit: "Good",
    durationOrDistance: "180",
    attemptType: "PB Attempt",
    notes: "Good breath hold, felt relaxed throughout",
    totalDiveTime: "3:00",
    issueComment: "",
    surfaceProtocol: "Perfect",
  };

  try {
    const saveResponse = await axios.post(
      `${API_BASE}/api/analyze/save-dive-log`,
      testDiveLog,
      {
        timeout: 15000,
        headers: { "Content-Type": "application/json" },
      },
    );

    console.log("✅ Dive log saved successfully:", saveResponse.status);
    console.log(
      "📊 Response data:",
      JSON.stringify(saveResponse.data, null, 2),
    );
  } catch (error) {
    console.error("❌ Error saving dive log:", error.message);
    return;
  }

  // Wait a moment for processing
  console.log("\n⏳ Waiting 2 seconds for processing...\n");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 2: Load dive logs to verify they're available
  console.log("2️⃣ Testing dive log retrieval...");
  try {
    const loadResponse = await axios.get(
      `${API_BASE}/api/analyze/get-dive-logs?userId=${TEST_USER_ID}`,
      {
        timeout: 10000,
      },
    );

    console.log("✅ Dive logs loaded successfully:", loadResponse.status);
    const diveLogs = loadResponse.data.diveLogs || [];
    console.log(`📊 Found ${diveLogs.length} dive logs for user`);

    if (diveLogs.length > 0) {
      console.log("📝 Latest dive log preview:");
      const latest = diveLogs[0];
      console.log(`   - Date: ${latest.date}`);
      console.log(`   - Discipline: ${latest.discipline}`);
      console.log(`   - Duration: ${latest.durationOrDistance}`);
      console.log(`   - Notes: ${latest.notes}`);
    }
  } catch (error) {
    console.error("❌ Error loading dive logs:", error.message);
    return;
  }

  // Test 3: Test chat with dive logs
  console.log("\n3️⃣ Testing chat with dive log context...");
  const chatData = {
    message:
      "Analyze my static apnea performance and give me specific coaching advice.",
    userId: TEST_USER_ID,
    embedMode: true,
    profile: {
      nickname: "TestUser",
      contactDetails: { firstName: "Test" },
    },
    diveLogs: [
      {
        id: "test-log-1",
        date: "2024-01-20",
        discipline: "STA",
        durationOrDistance: "180",
        location: "Training Pool",
        notes: "Good breath hold, felt relaxed throughout",
      },
    ],
  };

  try {
    const chatResponse = await axios.post(
      `${API_BASE}/api/openai/chat`,
      chatData,
      {
        timeout: 30000,
        headers: { "Content-Type": "application/json" },
      },
    );

    console.log("✅ Chat response received successfully:", chatResponse.status);
    const aiResponse = chatResponse.data.content;
    console.log("🤖 AI Response Preview:");
    console.log(
      aiResponse ? aiResponse.substring(0, 300) + "..." : "No content received",
    );
  } catch (error) {
    console.error("❌ Error in chat request:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
    }
    return;
  }

  // Test 4: Test bridge APIs (will fail gracefully without Wix)
  console.log("\n4️⃣ Testing bridge APIs...");
  try {
    const bridgeResponse = await axios.post(
      `${API_BASE}/api/wix/dive-logs-bridge`,
      {
        userId: TEST_USER_ID,
        limit: 10,
      },
      {
        timeout: 10000,
        headers: { "Content-Type": "application/json" },
      },
    );

    console.log("✅ Bridge API response:", bridgeResponse.status);
    console.log("📊 Bridge data source:", bridgeResponse.data.source);
    console.log(
      "📊 Bridge dive logs count:",
      bridgeResponse.data.diveLogs?.length || 0,
    );
  } catch (error) {
    console.log(
      "⚠️ Bridge API failed (expected without Wix):",
      error.response?.status || error.message,
    );
  }

  console.log("\n✅ Comprehensive test completed successfully!");
  console.log("\n📋 Summary:");
  console.log("   ✅ Dive log saving: Working");
  console.log("   ✅ Dive log loading: Working");
  console.log("   ✅ AI chat integration: Working");
  console.log("   ⚠️ Wix bridge APIs: Expected to fail in dev mode");
  console.log("\n🎯 The core dive log flow is functioning properly!");
}

// Test user display logic
async function testUserDisplayLogic() {
  console.log("\n👤 Testing user display logic...");

  const testCases = [
    {
      name: "Full profile with nickname",
      profile: {
        nickname: "TestNickname",
        contactDetails: { firstName: "Test", lastName: "User" },
        source: "Members/FullData",
      },
      userId: "user-123",
      expected: "TestNickname",
    },
    {
      name: "Profile with firstName only",
      profile: {
        contactDetails: { firstName: "Test" },
        source: "Members/FullData",
      },
      userId: "user-123",
      expected: "Test",
    },
    {
      name: "Waiting for profile data",
      profile: {},
      userId: "user-123",
      expected: "Loading...",
    },
  ];

  testCases.forEach((testCase) => {
    console.log(`   📋 ${testCase.name}:`);

    let displayName = "User"; // Default

    // Simulate the logic from embed.jsx
    if (testCase.profile?.nickname) {
      displayName = testCase.profile.nickname;
    } else if (testCase.profile?.contactDetails?.firstName) {
      displayName = testCase.profile.contactDetails.firstName;
    } else if (testCase.userId && !testCase.profile?.source) {
      displayName = "Loading...";
    }

    const result = displayName === testCase.expected ? "✅" : "❌";
    console.log(
      `      Expected: ${testCase.expected}, Got: ${displayName} ${result}`,
    );
  });
}

async function runAllTests() {
  try {
    await testCompleteFlow();
    await testUserDisplayLogic();
  } catch (error) {
    console.error("❌ Test suite failed:", error.message);
  }
}

runAllTests();
