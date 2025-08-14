// test-wix-repeater-integration.js
// Test the complete Wix UserMemory repeater integration for dive journals

const axios = require("axios");

const API_BASE = "http://localhost:3000";

async function testWixRepeaterIntegration() {
  console.log("🧪 Testing Wix UserMemory Repeater Integration...\n");

  const userId = "wix-repeater-test-user";
  const testDiveLog = {
    userId,
    date: new Date().toISOString().split("T")[0],
    disciplineType: "Depth",
    discipline: "CWT",
    location: "Dean's Blue Hole",
    targetDepth: 35,
    reachedDepth: 33,
    mouthfillDepth: 25,
    issueDepth: 0,
    squeeze: false,
    exit: "Good",
    durationOrDistance: "",
    attemptType: "Training",
    notes:
      "Excellent dive, good equalization down to 30m, slight pressure at 33m but managed well. Exit felt comfortable.",
    totalDiveTime: "",
    issueComment: "",
    surfaceProtocol: "Perfect recovery, clear surface protocol followed",
  };

  // Test 1: Save to Wix UserMemory Repeater
  console.log("📝 Step 1: Saving dive journal to Wix UserMemory repeater...");
  try {
    const saveResponse = await axios.post(
      `${API_BASE}/api/wix/dive-journal-repeater`,
      {
        ...testDiveLog,
        title: `${testDiveLog.discipline} - ${testDiveLog.location} (${testDiveLog.reachedDepth}m)`,
        progressionScore: 85,
        riskFactors: [],
        technicalNotes: "Mouthfill at 25m | Surface: Perfect recovery",
      },
    );

    console.log("✅ Dive journal saved to repeater:", saveResponse.data);

    if (saveResponse.data.wixId) {
      console.log(`🆔 Wix ID: ${saveResponse.data.wixId}`);
    }
  } catch (error) {
    console.error(
      "❌ Failed to save to Wix repeater:",
      error.response?.data || error.message,
    );
  }

  // Test 2: Retrieve dive journals from repeater
  console.log(
    "\n📊 Step 2: Retrieving dive journals from Wix UserMemory repeater...",
  );
  try {
    const getResponse = await axios.get(
      `${API_BASE}/api/wix/dive-journal-repeater?userId=${userId}&limit=10`,
    );

    console.log("✅ Retrieved dive journals from repeater:", getResponse.data);
    console.log(
      `📋 Found ${getResponse.data.entries?.length || 0} dive journal entries`,
    );

    if (getResponse.data.entries?.length > 0) {
      console.log("📄 Sample entry:", {
        id: getResponse.data.entries[0]._id,
        title: getResponse.data.entries[0].title,
        discipline: getResponse.data.entries[0].discipline,
        reachedDepth: getResponse.data.entries[0].reachedDepth,
      });
    }
  } catch (error) {
    console.error(
      "❌ Failed to retrieve from Wix repeater:",
      error.response?.data || error.message,
    );
  }

  // Test 3: Individual dive log analysis
  console.log("\n🔍 Step 3: Testing individual dive log analysis...");
  try {
    const analysisResponse = await axios.post(
      `${API_BASE}/api/analyze/single-dive-log`,
      {
        userId,
        diveLogData: testDiveLog,
      },
      {
        timeout: 30000,
      },
    );

    console.log("✅ Individual analysis completed!");
    console.log("🤖 AI Analysis:");
    console.log("=".repeat(60));
    console.log(analysisResponse.data.analysis);
    console.log("=".repeat(60));
  } catch (error) {
    console.error(
      "❌ Individual analysis failed:",
      error.response?.data || error.message,
    );
  }

  // Test 4: Pattern analysis across multiple logs
  console.log("\n📈 Step 4: Testing systematic pattern analysis...");
  try {
    const patternResponse = await axios.post(
      `${API_BASE}/api/analyze/pattern-analysis`,
      {
        userId,
        analysisType: "comprehensive",
        timeRange: "30days",
      },
      {
        timeout: 45000,
      },
    );

    console.log("✅ Pattern analysis completed!");
    console.log("📊 Pattern Analysis Results:");
    console.log("=".repeat(60));
    console.log(patternResponse.data.analysis);
    console.log("=".repeat(60));

    if (patternResponse.data.insights) {
      console.log("\n🔬 Extracted Insights:", patternResponse.data.insights);
    }
  } catch (error) {
    console.error(
      "❌ Pattern analysis failed:",
      error.response?.data || error.message,
    );
  }

  // Test 5: Chat integration with repeater data
  console.log("\n💬 Step 5: Testing chat integration with repeater data...");
  try {
    const chatResponse = await axios.post(
      `${API_BASE}/api/openai/chat`,
      {
        message:
          "Can you analyze my recent dive performance and give me coaching feedback for my next training session?",
        userId,
        embedMode: true,
        profile: {
          nickname: "RepeaterTestUser",
          source: "wix-usermemory-repeater",
        },
      },
      {
        timeout: 30000,
      },
    );

    console.log("✅ Chat integration working!");
    console.log("🤖 Koval AI Coaching Response:");
    console.log("=".repeat(60));
    console.log(chatResponse.data.assistantMessage.content);
    console.log("=".repeat(60));
  } catch (error) {
    console.error(
      "❌ Chat integration failed:",
      error.response?.data || error.message,
    );
  }

  console.log("\n🎯 Wix UserMemory Repeater Integration Test Complete!");
}

async function runTests() {
  console.log("🚀 Starting Wix UserMemory Repeater Integration Tests...\n");
  await testWixRepeaterIntegration();
}

runTests().catch(console.error);
