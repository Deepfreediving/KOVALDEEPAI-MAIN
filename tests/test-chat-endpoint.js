// 🔥 CHAT ENDPOINT TEST
// Test the OpenAI chat endpoint to see if it's working properly

const fetch = require("node-fetch");

async function testChatEndpoint() {
  console.log("🔍 Testing OpenAI Chat Endpoint...");
  console.log("=".repeat(60));

  const testMessage = {
    message: "Hello, this is a test message",
    userId: "test-user-123",
    sessionId: "test-session",
    source: "endpoint-test",
  };

  try {
    console.log("📤 Sending test message:", testMessage);

    const response = await fetch(
      "https://kovaldeepai-main.vercel.app/api/openai/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testMessage),
      },
    );

    console.log("📊 Response status:", response.status);
    console.log(
      "📊 Response headers:",
      Object.fromEntries(response.headers.entries()),
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Response not ok:", errorText);
      return;
    }

    const data = await response.json();
    console.log("✅ Response received:");
    console.log("  - Type:", typeof data);
    console.log("  - Keys:", Object.keys(data));
    console.log("  - Has message:", !!data.message);
    console.log("  - Has response:", !!data.response);
    console.log("  - Full response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("   Stack:", error.stack);
  }
}

testChatEndpoint();
