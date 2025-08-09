// 🧪 BACKEND FUNCTION TEST
// Add this to your frontend to test backend functions directly

console.log("🧪 Testing backend functions...");

// Test 1: Test wixConnection
async function testWixConnection() {
  try {
    console.log("🔄 Testing wixConnection...");
    const result = await backend.wixConnection({ test: true });
    console.log("✅ wixConnection result:", result);
  } catch (error) {
    console.error("❌ wixConnection failed:", error);
  }
}

// Test 2: Test chat
async function testChat() {
  try {
    console.log("🔄 Testing chat...");
    const result = await backend.chat({ 
      userMessage: "Hello test", 
      userId: "test-user" 
    });
    console.log("✅ chat result:", result);
  } catch (error) {
    console.error("❌ chat failed:", error);
  }
}

// Test 3: Test getUserProfile
async function testGetUserProfile() {
  try {
    console.log("🔄 Testing getUserProfile...");
    const result = await backend.getUserProfile("test-user-id");
    console.log("✅ getUserProfile result:", result);
  } catch (error) {
    console.error("❌ getUserProfile failed:", error);
  }
}

// Run tests if backend is available
if (backend && typeof backend === 'object') {
  console.log("🧪 Backend available, running tests...");
  
  // Run tests sequentially
  setTimeout(async () => {
    await testWixConnection();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testChat();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testGetUserProfile();
    
    console.log("🧪 Backend tests complete!");
  }, 2000);
} else {
  console.log("❌ Backend not available for testing");
}
