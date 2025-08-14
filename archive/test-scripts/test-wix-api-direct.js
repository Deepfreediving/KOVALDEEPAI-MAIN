// Test script to check Wix API directly
console.log("🔍 Testing Wix API Configuration...");

// Check environment variables
console.log("\n📋 Environment Variables:");
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log(
  "- WIX_API_KEY:",
  process.env.WIX_API_KEY
    ? `***${process.env.WIX_API_KEY.slice(-4)}`
    : "NOT SET",
);
console.log("- BASE_URL:", process.env.BASE_URL || "NOT SET");

// Test data
const testDiveLog = {
  diveLogId: `test-dive-${Date.now()}`,
  userId: "test-user-123",
  diveDate: "2024-12-20",
  diveTime: "10:30",
  logEntry: JSON.stringify({
    location: "Test Pool",
    depth: 10,
    notes: "Test dive log for API verification",
  }),
  watchedPhoto: null,
  squeeze: false,
  compressed: false,
  syncedAt: new Date().toISOString(),
};

console.log("\n📝 Test dive log data:");
console.log(JSON.stringify(testDiveLog, null, 2));

// Check if we can make a direct Wix API call
async function testWixAPIDirect() {
  console.log("\n🌐 Testing direct Wix API call...");

  if (!process.env.WIX_API_KEY) {
    console.log("❌ WIX_API_KEY not found in environment");
    console.log("💡 You need to set the WIX_API_KEY environment variable");
    return;
  }

  try {
    const response = await fetch("https://www.wixapis.com/wix-data/v2/items", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WIX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dataCollectionId: "DiveLogs",
        item: testDiveLog,
      }),
    });

    console.log("📥 Response status:", response.status);
    console.log(
      "📥 Response headers:",
      Object.fromEntries(response.headers.entries()),
    );

    const responseText = await response.text();
    console.log("📥 Response body:", responseText);

    if (response.ok) {
      console.log("✅ SUCCESS: Dive log saved to Wix DiveLogs collection!");
      try {
        const data = JSON.parse(responseText);
        console.log("📊 Saved item ID:", data.item?._id || "ID not found");
      } catch (e) {
        console.log("⚠️ Could not parse response as JSON");
      }
    } else {
      console.log("❌ FAILED: Wix API call failed");
      console.log("💡 Common issues:");
      console.log("   - Invalid API key");
      console.log("   - DiveLogs collection does not exist");
      console.log("   - Incorrect permissions");
      console.log("   - Field structure mismatch");
    }
  } catch (error) {
    console.log("❌ ERROR making Wix API call:", error.message);
  }
}

// Check if DiveLogs collection exists
async function checkCollection() {
  console.log("\n🗂️ Checking if DiveLogs collection exists...");

  if (!process.env.WIX_API_KEY) {
    console.log("❌ Cannot check collection - WIX_API_KEY not set");
    return;
  }

  try {
    const response = await fetch(
      "https://www.wixapis.com/wix-data/v2/collections",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.WIX_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("📥 Collections list status:", response.status);
    const responseText = await response.text();

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        const collections = data.collections || [];
        console.log("📋 Available collections:");
        collections.forEach((col) => {
          console.log(`   - ${col.id} (${col.displayName})`);
        });

        const diveLogs = collections.find((col) => col.id === "DiveLogs");
        if (diveLogs) {
          console.log("✅ DiveLogs collection found!");
          console.log("📊 Collection details:", diveLogs);
        } else {
          console.log("❌ DiveLogs collection NOT found");
          console.log(
            "💡 You need to create a DiveLogs collection in your Wix site",
          );
        }
      } catch (e) {
        console.log("⚠️ Could not parse collections response");
      }
    } else {
      console.log("❌ Failed to get collections list:", responseText);
    }
  } catch (error) {
    console.log("❌ ERROR checking collections:", error.message);
  }
}

// Run tests
async function runTests() {
  await checkCollection();
  await testWixAPIDirect();

  console.log("\n🎯 SUMMARY:");
  console.log("If the tests above failed, the most likely issues are:");
  console.log("1. WIX_API_KEY is not set or is invalid");
  console.log("2. DiveLogs collection does not exist in your Wix site");
  console.log("3. Collection permissions are too restrictive");
  console.log("4. Field structure does not match the expected format");
  console.log("\n💡 NEXT STEPS:");
  console.log("1. Set WIX_API_KEY environment variable");
  console.log("2. Create DiveLogs collection in Wix with these fields:");
  console.log("   - diveLogId (Text)");
  console.log("   - userId (Text)");
  console.log("   - diveDate (Date)");
  console.log("   - diveTime (Text)");
  console.log("   - logEntry (Text)");
  console.log("   - watchedPhoto (Image, optional)");
  console.log("   - squeeze (Boolean)");
  console.log("   - compressed (Boolean)");
  console.log("   - syncedAt (Date)");
}

runTests().catch(console.error);
