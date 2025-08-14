// Test dive log submission flow
// test-dive-log-flow.js

const axios = require("axios");

const API_BASE = "http://localhost:3000";

async function testDiveLogFlow() {
  console.log("🧪 Testing dive log submission flow...");

  const testDiveLog = {
    userId: "test-user-123",
    date: "2024-01-15",
    disciplineType: "Dynamic",
    discipline: "DYN",
    location: "Test Pool",
    targetDepth: "25",
    reachedDepth: "22",
    mouthfillDepth: "15",
    issueDepth: "",
    squeeze: false,
    exit: "Good",
    durationOrDistance: "120",
    attemptType: "Training",
    notes: "Test dive log submission for debugging",
    totalDiveTime: "2:00",
    issueComment: "",
    surfaceProtocol: "Good",
  };

  try {
    console.log("📤 Submitting dive log to save API...");
    console.log("Data:", JSON.stringify(testDiveLog, null, 2));

    const response = await axios.post(
      `${API_BASE}/api/analyze/save-dive-log`,
      testDiveLog,
      {
        timeout: 10000,
        headers: { "Content-Type": "application/json" },
      },
    );

    console.log("✅ Dive log save response:", response.status);
    console.log("Response data:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ Error saving dive log:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

async function testChatWithDiveLogs() {
  console.log("💬 Testing chat with dive logs...");

  const chatData = {
    message: "Can you analyze my recent dive logs?",
    userId: "test-user-123",
    embedMode: true,
    profile: {
      nickname: "TestUser",
      contactDetails: { firstName: "Test" },
    },
    diveLogs: [
      {
        id: "test-log-1",
        date: "2024-01-15",
        discipline: "DYN",
        reachedDepth: 22,
        location: "Test Pool",
        notes: "Good training dive",
      },
    ],
  };

  try {
    console.log("📤 Sending chat request with dive logs...");

    const response = await axios.post(`${API_BASE}/api/openai/chat`, chatData, {
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
    });

    console.log("✅ Chat response received:", response.status);
    console.log("AI Response:", response.data.content);
  } catch (error) {
    console.error("❌ Error in chat request:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

async function runTests() {
  console.log("🚀 Starting dive log flow tests...\n");

  // Test 1: Save dive log
  await testDiveLogFlow();
  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: Chat with dive logs
  await testChatWithDiveLogs();

  console.log("\n✅ Test suite completed");
}

runTests().catch(console.error);
