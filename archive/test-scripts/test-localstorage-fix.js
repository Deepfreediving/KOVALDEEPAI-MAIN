// Test for localStorage dive log saving functionality
// Place this in browser console to test

function testDiveLogLocalStorageSave() {
  console.log("🧪 Testing dive log localStorage save functionality...");

  const testUserId = "test-user-" + Date.now();
  const testDiveLog = {
    id: "dive_" + testUserId + "_" + Date.now(),
    timestamp: new Date().toISOString(),
    userId: testUserId,
    date: "2024-12-20",
    disciplineType: "depth",
    discipline: "Constant Weight",
    location: "Test Pool",
    targetDepth: 20,
    reachedDepth: 18,
    notes: "Test dive log for localStorage functionality",
    source: "test",
  };

  // Test the localStorage save function (from wix-frontend-page-simplified.js)
  try {
    // Simulate the localStorage save function
    const storageKey = "diveLogs-" + testUserId;

    // Get existing logs
    let existingLogs = [];
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        existingLogs = JSON.parse(stored);
      }
    } catch (parseError) {
      console.warn(
        "⚠️ Could not parse existing logs, starting fresh:",
        parseError,
      );
      existingLogs = [];
    }

    // Add new log
    existingLogs.push(testDiveLog);

    // Sort by date (newest first)
    existingLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(existingLogs));

    // Verify
    const savedLogs = JSON.parse(localStorage.getItem(storageKey) || "[]");

    console.log("✅ localStorage save test results:", {
      storageKey: storageKey,
      savedCount: savedLogs.length,
      testLogFound: savedLogs.some((log) => log.id === testDiveLog.id),
      allLogs: savedLogs,
    });

    // Clean up test data
    localStorage.removeItem(storageKey);
    console.log("🧹 Test data cleaned up");

    return true;
  } catch (error) {
    console.error("❌ localStorage save test failed:", error);
    return false;
  }
}

// Test different localStorage key formats used in the app
function testLocalStorageKeyFormats() {
  console.log("🔑 Testing localStorage key formats...");

  const testUserId = "test-123";
  const keyFormats = [
    `diveLogs-${testUserId}`, // Main app format
    `savedDiveLogs_${testUserId}`, // Legacy format
    `diveLogs_${testUserId}`, // Alternative format
    "savedDiveLogs", // Global format
    "koval_ai_logs", // Widget format
  ];

  keyFormats.forEach((key) => {
    try {
      const existing = localStorage.getItem(key);
      console.log(
        `📋 ${key}:`,
        existing ? JSON.parse(existing).length + " logs" : "empty",
      );
    } catch (error) {
      console.log(`❌ ${key}: parse error`);
    }
  });
}

// Run tests
testDiveLogLocalStorageSave();
testLocalStorageKeyFormats();

console.log("🎯 To test in the actual app:");
console.log("1. Save a dive log through the journal");
console.log("2. Check if it appears in the sidebar immediately");
console.log("3. Refresh the page and see if it persists");
console.log("4. Check localStorage keys: diveLogs-{userId}");
