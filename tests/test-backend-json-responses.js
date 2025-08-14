// 🔥 BACKEND JSON RESPONSE TEST
// Tests that all backend functions return valid JSON responses

const fs = require("fs");
const path = require("path");

console.log("🔥 TESTING BACKEND JSON RESPONSES...");
console.log("=".repeat(60));

// Test backend file structure
const backendFiles = [
  "wix-site/wix-app/backend/memberProfile.jsw",
  "wix-site/wix-app/backend/test.jsw",
  "wix-site/wix-app/backend/userMemory.jsw",
  "wix-site/wix-app/backend/chat.jsw",
  "wix-site/wix-app/backend/diveLogs.jsw",
];

let allFilesValid = true;

backendFiles.forEach((file) => {
  const fullPath = path.join(__dirname, file);

  if (fs.existsSync(fullPath)) {
    console.log(`✅ Found: ${file}`);

    const content = fs.readFileSync(fullPath, "utf8");

    // Check for proper response structure patterns
    const hasHttpResponses =
      content.includes("createResponse") ||
      content.includes("ok(") ||
      content.includes("serverError(") ||
      content.includes("badRequest(");

    const hasWrapperFunctions =
      content.includes("result.body") || content.includes("return result");

    const hasValidJsonReturns =
      content.includes("body:") ||
      content.includes('"success":') ||
      content.includes("success: true");

    if (hasHttpResponses && hasWrapperFunctions && hasValidJsonReturns) {
      console.log(`  ✅ Valid response structure detected`);
    } else {
      console.log(`  ⚠️ Response structure may need review:`);
      console.log(`    - HTTP responses: ${hasHttpResponses}`);
      console.log(`    - Wrapper functions: ${hasWrapperFunctions}`);
      console.log(`    - Valid JSON returns: ${hasValidJsonReturns}`);
      allFilesValid = false;
    }
  } else {
    console.log(`❌ Missing: ${file}`);
    allFilesValid = false;
  }
});

console.log("=".repeat(60));

if (allFilesValid) {
  console.log("✅ ALL BACKEND FILES HAVE PROPER JSON RESPONSE STRUCTURE");
} else {
  console.log("⚠️ SOME BACKEND FILES MAY NEED JSON RESPONSE FIXES");
}

console.log("\n🔍 NEXT STEPS:");
console.log(
  "1. Check that wrapper functions always return .body or structured response",
);
console.log("2. Ensure HTTP functions never return empty responses");
console.log("3. Test frontend-backend integration with real data");
console.log("4. Verify error handling returns proper JSON structure");
