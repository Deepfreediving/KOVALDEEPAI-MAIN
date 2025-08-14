// debug-usermemory-integration.js
// Debug script to test UserMemory integration step by step

const API_BASE = "http://localhost:3001";

// Test basic API connectivity first
async function testBasicConnectivity() {
  console.log("🔗 Testing basic API connectivity...");

  try {
    const response = await fetch(
      `${API_BASE}/api/wix/dive-journal-repeater?userId=test-connectivity`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`📡 Response status: ${response.status}`);
    const text = await response.text();
    console.log(`📄 Response body: ${text.substring(0, 200)}...`);

    if (response.ok) {
      console.log("✅ Basic connectivity working");
      return true;
    } else {
      console.log("❌ Basic connectivity failed");
      return false;
    }
  } catch (error) {
    console.error("❌ Network error:", error.message);
    return false;
  }
}

// Test minimal dive log save
async function testMinimalSave() {
  console.log("\n📊 Testing minimal dive log save...");

  const minimalDiveLog = {
    userId: "debug-user-123",
    date: "2024-08-09",
    discipline: "CNF",
    targetDepth: 30,
    reachedDepth: 25,
    location: "Test Pool",
    notes: "Debug test dive log",
  };

  try {
    const response = await fetch(`${API_BASE}/api/wix/dive-journal-repeater`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(minimalDiveLog),
    });

    console.log(`📡 Save response status: ${response.status}`);
    const text = await response.text();
    console.log(`📄 Save response: ${text.substring(0, 300)}...`);

    if (response.ok) {
      const result = JSON.parse(text);
      console.log("✅ Minimal save successful:", result.wixId?.substring(0, 8));
      return result.wixId;
    } else {
      console.log("❌ Minimal save failed");
      return null;
    }
  } catch (error) {
    console.error("❌ Save error:", error.message);
    return null;
  }
}

// Test retrieval
async function testRetrieval(userId = "debug-user-123") {
  console.log("\n📥 Testing dive log retrieval...");

  try {
    const response = await fetch(
      `${API_BASE}/api/wix/dive-journal-repeater?userId=${userId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`📡 Retrieval response status: ${response.status}`);
    const text = await response.text();
    console.log(`📄 Retrieval response: ${text.substring(0, 300)}...`);

    if (response.ok) {
      const result = JSON.parse(text);
      console.log(
        "✅ Retrieval successful:",
        result.logs?.length || 0,
        "logs found",
      );
      return result.logs;
    } else {
      console.log("❌ Retrieval failed");
      return null;
    }
  } catch (error) {
    console.error("❌ Retrieval error:", error.message);
    return null;
  }
}

// Run debug tests
async function runDebugTests() {
  console.log("🔍 Starting UserMemory integration debug tests...\n");

  const connectivity = await testBasicConnectivity();
  if (!connectivity) {
    console.log("\n❌ Cannot proceed - basic connectivity failed");
    return;
  }

  const saveId = await testMinimalSave();
  if (!saveId) {
    console.log("\n❌ Cannot proceed - save failed");
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

  const logs = await testRetrieval();
  if (logs && logs.length > 0) {
    console.log("\n✅ Full integration test successful!");
    console.log("📋 Sample log:", {
      date: logs[0].date,
      discipline: logs[0].discipline,
      depth: logs[0].reachedDepth,
      location: logs[0].location,
    });
  } else {
    console.log("\n❌ Integration test failed - could not retrieve saved log");
  }
}

// Run the debug tests
runDebugTests().catch((error) => {
  console.error("💥 Debug test crashed:", error);
});
