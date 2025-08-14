// ===== V5.0 MEMBER DETECTION TEST SCRIPT =====
// Copy and paste this into your browser console on the live Wix site
// to verify that V5.0 member detection is working correctly

console.log("🧪 =================================");
console.log("🧪 V5.0 MEMBER DETECTION TEST");
console.log("🧪 =================================");

// Test 1: Check widget version
console.log("\n📋 1. WIDGET VERSION CHECK:");
try {
  const widget = document.querySelector("koval-ai");
  if (widget) {
    console.log("✅ Widget element found");
    console.log("🔍 Checking for V5.0 indicators...");
  } else {
    console.log("❌ Widget element not found - check widget ID");
  }
} catch (e) {
  console.log("⚠️ Widget check error:", e.message);
}

// Test 2: Check global user data variables
console.log("\n📋 2. GLOBAL USER DATA CHECK:");
if (window.KOVAL_USER_DATA_V5) {
  console.log("✅ V5.0 user data found:");
  console.log("   • Version:", window.KOVAL_USER_DATA_V5.version);
  console.log("   • User ID:", window.KOVAL_USER_DATA_V5.userId);
  console.log("   • Member ID:", window.KOVAL_USER_DATA_V5.memberId);
  console.log("   • Source:", window.KOVAL_USER_DATA_V5.source);
  console.log(
    "   • Detection Method:",
    window.KOVAL_USER_DATA_V5.memberDetectionMethod,
  );
  console.log("   • Is Guest:", window.KOVAL_USER_DATA_V5.isGuest);
} else if (window.KOVAL_USER_DATA) {
  console.log("⚠️ Found legacy user data (V4.0 or earlier)");
  console.log("   • Update needed - V5.0 not deployed");
} else {
  console.log("ℹ️ No global user data found - may still be loading");
}

// Test 3: Check member ID format
console.log("\n📋 3. MEMBER ID FORMAT CHECK:");
const userId = window.wixUserId || window.KOVAL_USER_DATA_V5?.userId;
const memberId = window.wixMemberId || window.KOVAL_USER_DATA_V5?.memberId;

if (userId) {
  if (userId.startsWith("guest-") || userId.startsWith("session-")) {
    console.log("ℹ️ Guest user detected:", userId);
    console.log("   • Expected for non-authenticated users");
  } else if (userId.startsWith("wix-") || userId.includes("_")) {
    console.log("❌ Legacy ID format detected:", userId);
    console.log("   • V5.0 should use raw Wix Member IDs");
  } else {
    console.log("✅ V5.0 member ID format detected:", userId);
    console.log("   • Raw Wix Member ID (no prefixes)");
  }
} else {
  console.log("ℹ️ No user ID available - check authentication");
}

// Test 4: Message listening test
console.log("\n📋 4. MESSAGE BRIDGE TEST:");
let messageReceived = false;
const messageListener = (event) => {
  if (event.data && event.data.type === "USER_DATA_RESPONSE") {
    messageReceived = true;
    console.log("✅ V5.0 USER_DATA_RESPONSE received:");
    console.log("   • Type:", event.data.type);
    console.log("   • Source:", event.data.source);
    console.log("   • Member ID:", event.data.userData?.memberId);
    console.log("   • Version:", event.data.userData?.version);
    window.removeEventListener("message", messageListener);
  }
};

window.addEventListener("message", messageListener);
setTimeout(() => {
  if (!messageReceived) {
    console.log(
      "ℹ️ No USER_DATA_RESPONSE received - may indicate V4.0 or earlier",
    );
    window.removeEventListener("message", messageListener);
  }
}, 3000);

// Test 5: Check console for V5.0 logs
console.log("\n📋 5. CONSOLE LOG CHECK:");
console.log("🔍 Look for these V5.0 indicators in console:");
console.log('   • "v5.0-DIVELOGS-ENHANCED loaded safely"');
console.log('   • "V5.0: Wix user authenticated with real member ID"');
console.log('   • "V5.0: Sending user data to widget"');
console.log('   • "memberDetectionMethod" tracking');

// Test 6: Simulate dive log save test
console.log("\n📋 6. DIVE LOG SAVE TEST:");
console.log("🧪 To test dive log saving with V5.0 member detection:");
console.log("1. Open the AI chat widget");
console.log("2. Create a new dive log entry");
console.log("3. Check console for member ID in save request");
console.log(
  "4. Verify the saved log in DiveLogs collection has correct member ID",
);

console.log("\n🧪 =================================");
console.log("🧪 V5.0 TEST COMPLETE");
console.log("🧪 =================================");
console.log("💡 If any tests fail, V5.0 deployment may be incomplete");
console.log("💡 Refresh the page and run this test again");
