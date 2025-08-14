// 🧪 BROWSER CONSOLE TEST - Copy and paste this entire block into your browser console
// Run this on: https://www.deepfreediving.com/large-koval-deep-ai-page

console.log("🧪 STARTING LIVE SITE DIVE LOG TEST...");
console.log("================================================");

// Test function to check if dive logs save to DiveLogs collection
function testDiveLogSaveNow() {
  console.log(
    "🔍 Testing dive log save to DiveLogs collection with correct field names...",
  );

  const testDiveLog = {
    userId: "live-test-" + Date.now(),
    date: new Date().toISOString().split("T")[0],
    discipline: "TEST - Live Site Check",
    location: "Browser Console Test",
    targetDepth: 15,
    reachedDepth: 15,
    notes:
      "FIELD MAPPING TEST - If you see this in DiveLogs collection, the field bug is FIXED!",
    timestamp: new Date().toISOString(),
    source: "browser-console-test",
  };

  console.log("📝 Test dive log data:", testDiveLog);

  // Also test direct Wix save with correct field names
  if (typeof wixData !== "undefined" && wixData.save) {
    console.log(
      "✅ Wix data API found - testing direct save with correct field names...",
    );

    const directTestData = {
      "User ID": "browser-test-" + Date.now(),
      "Dive Log ID": "browser-log-" + Date.now(),
      "Log Entry": JSON.stringify(testDiveLog),
      "Dive Date": testDiveLog.date,
      "Dive Time": "2:15",
    };

    wixData
      .save("DiveLogs", directTestData)
      .then((result) => {
        console.log(
          "🎉 DIRECT SAVE SUCCESS! Field mapping fix worked:",
          result._id,
        );
        console.log("✅ The 3-week DiveLogs collection bug is FIXED!");
        console.log(
          "🔍 Check your Wix Editor > Database > DiveLogs collection",
        );
      })
      .catch((error) => {
        console.error("❌ Direct save failed:", error);
        console.log("🔍 Field mapping still needs work...");
      });
  }

  // Check if the save function exists
  if (typeof saveDiveLogToWix === "function") {
    console.log("✅ saveDiveLogToWix function found - testing widget save...");

    saveDiveLogToWix(testDiveLog)
      .then((result) => {
        console.log(
          "🎉 WIDGET SAVE SUCCESS! Dive log saved successfully:",
          result,
        );
        console.log("✅ The DiveLogs collection save is working!");
        console.log(
          "🔍 Now check your Wix Editor > Database > DiveLogs collection",
        );
        console.log('📋 Look for entry with location: "Browser Console Test"');
      })
      .catch((error) => {
        console.error("❌ Widget save failed:", error.message);
        console.log("🔍 Error details:", error);
        console.log("⚠️ The collection save still needs fixing");
      });
  } else {
    console.error("❌ saveDiveLogToWix function not found");
    console.log("⚠️ Widget may not be fully loaded yet");
    console.log("🔄 Try refreshing the page and running this test again");
  }
}

// Check widget status first
if (typeof globalSessionData !== "undefined") {
  console.log("✅ Widget session data found:", {
    initialized: globalSessionData.widgetInitialized,
    connectionStatus: globalSessionData.connectionStatus,
    userId: globalSessionData.userId,
  });
} else {
  console.log("⚠️ Global session data not found - widget may not be loaded");
}

// Run the test
console.log("🚀 Running dive log save test...");
testDiveLogSaveNow();

console.log("================================================");
console.log("📋 WHAT TO CHECK NEXT:");
console.log("1. Look at console output above for success/error messages");
console.log("2. Go to Wix Editor > Database > DiveLogs collection");
console.log('3. Look for test entry with location "Browser Console Test"');
console.log(
  "4. If test succeeds, try saving a real dive log through the widget",
);
console.log("================================================");
