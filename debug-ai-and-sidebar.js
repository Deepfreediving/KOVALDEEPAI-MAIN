#!/usr/bin/env node

/**
 * Debug script to test AI analysis and sidebar refresh issues
 * Tests:
 * 1. Single dive log analysis API
 * 2. Chat API response quality  
 * 3. LocalStorage and sidebar refresh functionality
 */

console.log("🔧 Debug: AI Analysis and Sidebar Issues");
console.log("==========================================");

const testCases = [
  {
    name: "Test Single Dive Log Analysis API",
    test: async () => {
      console.log("\n📊 Testing single dive log analysis...");
      
      const testDiveLog = {
        id: "test-dive-" + Date.now(),
        date: "2025-08-14",
        discipline: "FIM",
        location: "bohol philippines",
        targetDepth: 102,
        reachedDepth: 102,
        notes: "Great dive nice and relaxed all through a big jump from my previous pb of 96m"
      };

      try {
        const response = await fetch("http://localhost:3000/api/analyze/single-dive-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nickname: "session-17553021460622", // Use actual session ID from screenshots
            diveLogData: testDiveLog,
          }),
        });

        console.log("📊 Response status:", response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log("✅ Analysis result:", {
            success: result.success,
            analysisLength: result.analysis?.length || 0,
            analysisPreview: result.analysis?.substring(0, 200) + "..."
          });
          
          if (result.analysis && result.analysis.includes("I received your message")) {
            console.log("❌ PROBLEM: AI is giving generic response instead of analysis!");
          } else {
            console.log("✅ AI analysis appears to be working correctly");
          }
        } else {
          console.error("❌ API call failed:", await response.text());
        }
      } catch (error) {
        console.error("❌ Test failed:", error.message);
      }
    }
  },
  
  {
    name: "Test Chat API Directly",
    test: async () => {
      console.log("\n💬 Testing chat API directly...");
      
      const testMessage = `🏊‍♂️ INDIVIDUAL DIVE LOG ANALYSIS REQUEST

Please analyze this specific dive log and provide detailed coaching feedback:

📊 DIVE DETAILS:
- Date: 2025-08-14
- Discipline: FIM (Freediving)
- Location: bohol philippines
- Target Depth: 102m
- Reached Depth: 102m
- Depth Achievement: 100.0%
- Notes: Great dive nice and relaxed all through a big jump from my previous pb of 96m

🎯 COACHING ANALYSIS NEEDED:
1. **Performance Assessment**: How did this dive go overall?
2. **Technical Analysis**: What went well and what needs improvement?
3. **Safety Evaluation**: Any safety concerns or positive safety practices?
4. **Next Steps**: Specific recommendations for the next training session
5. **Progression**: How does this fit into their overall development?

Please provide specific, actionable coaching feedback based on this dive data.`;

      try {
        const response = await fetch("http://localhost:3000/api/openai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: testMessage,
            nickname: "session-17553021460622",
            embedMode: true,
            profile: { nickname: "session-17553021460622", source: "dive-log-analysis" },
          }),
        });

        console.log("💬 Response status:", response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log("✅ Chat result:", {
            hasMessage: !!result.assistantMessage?.content,
            messageLength: result.assistantMessage?.content?.length || 0,
            messagePreview: result.assistantMessage?.content?.substring(0, 200) + "..."
          });
          
          if (result.assistantMessage?.content?.includes("I received your message")) {
            console.log("❌ PROBLEM: Chat API is giving generic response!");
            console.log("Full response:", result.assistantMessage.content);
          } else {
            console.log("✅ Chat API appears to be working correctly");
          }
        } else {
          console.error("❌ Chat API call failed:", await response.text());
        }
      } catch (error) {
        console.error("❌ Chat test failed:", error.message);
      }
    }
  },

  {
    name: "Test localStorage Storage Keys",
    test: async () => {
      console.log("\n💾 Testing localStorage keys...");
      
      // Simulate the patterns used in the app
      const testCases = [
        "session-17553021460622",
        "User-session-17553021460622", 
        "guest-user",
        "testNickname"
      ];
      
      testCases.forEach(identifier => {
        const storageKey = `diveLogs_${identifier}`;
        console.log(`🔑 Storage key for "${identifier}": ${storageKey}`);
        
        // Test what would be in localStorage
        const testLog = {
          id: "test-" + Date.now(),
          nickname: identifier,
          date: "2025-08-14",
          discipline: "FIM"
        };
        
        console.log(`   Test log would be saved with key: ${storageKey}`);
      });
      
      console.log("\n📱 Make sure DiveJournalDisplay and SavedDiveLogsViewer use the same key pattern!");
    }
  }
];

// Run all tests
async function runTests() {
  for (const testCase of testCases) {
    console.log(`\n🧪 Running: ${testCase.name}`);
    try {
      await testCase.test();
    } catch (error) {
      console.error(`❌ Test "${testCase.name}" failed:`, error.message);
    }
  }
  
  console.log("\n🔧 Debug Complete");
  console.log("==========================================");
  console.log("SUMMARY:");
  console.log("1. Check if AI analysis API returns proper analysis or 'I received your message'");
  console.log("2. Check if chat API provides detailed responses or generic ones");
  console.log("3. Verify localStorage key consistency between components");
  console.log("\nIf tests show issues, check:");
  console.log("- OpenAI API configuration and rate limits");
  console.log("- Field mapping between nickname/userId in APIs");
  console.log("- Storage key consistency in frontend components");
}

if (require.main === module) {
  runTests().catch(console.error);
}
