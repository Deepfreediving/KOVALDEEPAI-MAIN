// Test RAG-powered EQ Plan API
// This tests whether the API correctly retrieves Daniel's methodology from the knowledge base

const API_BASE = 'http://localhost:3000/api';

// Test scenarios
const testCases = [
  {
    name: "Unknown Reverse Pack - Should Provide Guidance",
    data: {
      targetDepth: 50
      // No maxReversePack provided
    }
  },
  {
    name: "90m Elite Diver",
    data: {
      targetDepth: 90,
      maxReversePack: 70,
      userLevel: 'advanced'
    }
  },
  {
    name: "Intermediate 60m Dive",
    data: {
      targetDepth: 60,
      maxReversePack: 45,
      userLevel: 'intermediate'
    }
  }
];

async function testEQPlanAPI() {
  console.log('🧪 TESTING RAG-POWERED EQ PLAN API');
  console.log('===================================');
  
  for (const testCase of testCases) {
    console.log(`\n🎯 TEST: ${testCase.name}`);
    console.log(`Input: ${JSON.stringify(testCase.data)}`);
    
    try {
      const response = await fetch(`${API_BASE}/coach/eq-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.data)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ SUCCESS');
        if (result.success) {
          console.log(`Mouthfill: ${result.eqPlan.mouthfillDepth}m`);
          console.log(`Volume: ${result.eqPlan.volumeRecommendation?.size}`);
          console.log(`Total EQs: ${result.eqPlan.totalEQCount}`);
          console.log(`Theoretical Max: ${result.eqPlan.theoreticalMaxDepth}m`);
        } else {
          console.log('📋 GUIDANCE PROVIDED:');
          console.log(result.message);
        }
      } else {
        console.log('❌ ERROR:', result.error);
      }
      
    } catch (error) {
      console.log('❌ NETWORK ERROR:', error.message);
    }
  }
  
  console.log('\n🎯 SUMMARY:');
  console.log('Now the EQ Plan API should be pulling Daniel\'s methodology');
  console.log('directly from the knowledge base via RAG instead of hardcoded logic!');
}

testEQPlanAPI();
