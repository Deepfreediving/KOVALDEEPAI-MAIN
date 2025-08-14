// test-frontend-integration-simulation.js
// Test the frontend dive log submission flow with simulated UserMemory responses

const API_BASE = "http://localhost:3001";

// Test the save-dive-log API (which should save locally and attempt Wix sync)
async function testDiveLogSubmission() {
  console.log("🏊‍♂️ Testing dive log submission flow...");

  const testDiveLog = {
    userId: "sim-user-123",
    title: "Frontend Integration Test",
    date: "2024-08-09",
    discipline: "CNF",
    disciplineType: "Constant Weight No Fins",
    location: "Test Pool",
    targetDepth: 40,
    reachedDepth: 35,
    mouthfillDepth: 25,
    issueDepth: null,
    issueComment: "",
    exit: "normal",
    durationOrDistance: "120 seconds",
    attemptType: "Training",
    notes: "Great dive, felt relaxed throughout",
    totalDiveTime: 120,
    surfaceProtocol: "OK",
    squeeze: "None",
  };

  try {
    console.log("📊 Submitting dive log via save-dive-log API...");
    const response = await fetch(`${API_BASE}/api/analyze/save-dive-log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testDiveLog),
    });

    console.log(`📡 Response status: ${response.status}`);
    const result = await response.text();
    console.log(`📄 Response: ${result.substring(0, 400)}...`);

    if (response.ok) {
      const data = JSON.parse(result);
      console.log("✅ Local save successful, dive ID:", data.id);
      console.log("📋 Progression score:", data.progressionScore);
      console.log("⚠️ Risk factors:", data.riskFactors?.join(", ") || "None");

      // The Wix sync will fail but that's expected for now
      console.log("💡 Note: Wix sync may fail until backend is configured");
      return data.id;
    } else {
      console.log("❌ Save failed");
      return null;
    }
  } catch (error) {
    console.error("❌ Submission error:", error.message);
    return null;
  }
}

// Test loading dive logs
async function testDiveLogLoading() {
  console.log("\n📥 Testing dive log loading...");

  try {
    const response = await fetch(
      `${API_BASE}/api/analyze/get-dive-logs?userId=sim-user-123`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`📡 Load response status: ${response.status}`);
    const result = await response.text();

    if (response.ok) {
      const data = JSON.parse(result);
      console.log("✅ Loaded", data.logs?.length || 0, "dive logs");

      if (data.logs && data.logs.length > 0) {
        const latestLog = data.logs[0];
        console.log("📋 Latest dive:", {
          date: latestLog.date,
          discipline: latestLog.discipline,
          depth: `${latestLog.targetDepth}m → ${latestLog.reachedDepth}m`,
          location: latestLog.location,
          progressionScore: latestLog.progressionScore,
        });
      }

      return data.logs;
    } else {
      console.log("❌ Load failed");
      return null;
    }
  } catch (error) {
    console.error("❌ Load error:", error.message);
    return null;
  }
}

// Test individual dive log analysis
async function testDiveLogAnalysis(userId = "sim-user-123") {
  console.log("\n🔍 Testing individual dive log analysis...");

  // First get a dive log to analyze
  const logs = await testDiveLogLoading();
  if (!logs || logs.length === 0) {
    console.log("❌ No logs available for analysis");
    return;
  }

  const logToAnalyze = logs[0];
  console.log("🎯 Analyzing dive:", logToAnalyze.title || "Untitled");

  try {
    const response = await fetch(`${API_BASE}/api/analyze/single-dive-log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
        diveLogId: logToAnalyze.id,
        diveLog: logToAnalyze,
      }),
    });

    console.log(`📡 Analysis response status: ${response.status}`);
    const result = await response.text();

    if (response.ok) {
      const data = JSON.parse(result);
      console.log("✅ Analysis completed");
      console.log(
        "🤖 AI insight preview:",
        data.analysis?.substring(0, 150) + "...",
      );
      console.log(
        "📊 Updated progression score:",
        data.updatedLog?.progressionScore,
      );
      return data.analysis;
    } else {
      console.log("❌ Analysis failed");
      console.log("📄 Error:", result.substring(0, 200));
      return null;
    }
  } catch (error) {
    console.error("❌ Analysis error:", error.message);
    return null;
  }
}

// Test pattern analysis
async function testPatternAnalysis(userId = "sim-user-123") {
  console.log("\n📈 Testing pattern analysis...");

  try {
    const response = await fetch(`${API_BASE}/api/analyze/pattern-analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
        analysisType: "progression",
      }),
    });

    console.log(`📡 Pattern analysis response status: ${response.status}`);
    const result = await response.text();

    if (response.ok) {
      const data = JSON.parse(result);
      console.log("✅ Pattern analysis completed");
      console.log(
        "📊 Key insights:",
        data.insights?.keyFindings?.join(", ") || "None",
      );
      console.log(
        "🎯 Recommendations:",
        data.insights?.recommendations?.slice(0, 2)?.join(", ") || "None",
      );
      return data.insights;
    } else {
      console.log("❌ Pattern analysis failed");
      console.log("📄 Error:", result.substring(0, 200));
      return null;
    }
  } catch (error) {
    console.error("❌ Pattern analysis error:", error.message);
    return null;
  }
}

// Run comprehensive frontend integration test
async function runFrontendIntegrationTest() {
  console.log("🚀 Starting Frontend Integration Test...\n");
  console.log(
    "💡 This tests the dive log flow as it would work from your Wix frontend\n",
  );

  // Test 1: Submit dive log
  const diveId = await testDiveLogSubmission();
  if (!diveId) {
    console.log("\n❌ Critical failure: Cannot save dive logs");
    return;
  }

  // Wait a moment for processing
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 2: Load dive logs (for sidebar display)
  const logs = await testDiveLogLoading();
  if (!logs || logs.length === 0) {
    console.log("\n❌ Critical failure: Cannot load dive logs");
    return;
  }

  // Test 3: Individual dive analysis (click-to-analyze)
  const analysis = await testDiveLogAnalysis();
  if (!analysis) {
    console.log("\n⚠️ Analysis failed - may be OpenAI API issue");
  }

  // Test 4: Pattern analysis (systematic coaching)
  const patterns = await testPatternAnalysis();
  if (!patterns) {
    console.log("\n⚠️ Pattern analysis failed - may be OpenAI API issue");
  }

  console.log("\n🏁 Frontend Integration Test Summary:");
  console.log("✅ Dive log submission:", diveId ? "Working" : "Failed");
  console.log("✅ Dive log loading:", logs ? "Working" : "Failed");
  console.log(
    "🤖 Individual analysis:",
    analysis ? "Working" : "Needs OpenAI config",
  );
  console.log(
    "📈 Pattern analysis:",
    patterns ? "Working" : "Needs OpenAI config",
  );
  console.log("\n💡 Next steps:");
  console.log("1. Configure Wix UserMemory backend for permanent storage");
  console.log("2. Ensure OpenAI API key is properly configured");
  console.log(
    "3. Test from your live Wix page at https://www.deepfreediving.com/large-koval-deep-ai-page",
  );
}

// Run the test
runFrontendIntegrationTest().catch((error) => {
  console.error("💥 Frontend integration test crashed:", error);
});
