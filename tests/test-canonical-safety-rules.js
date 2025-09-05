/**
 * 🛡️ CANONICAL SAFETY RULES REGRESSION TEST
 * 
 * Ensures that safety-critical queries always return Daniel Koval's 
 * canonical content with mandatory "Bot Must Say" statements.
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

const SAFETY_QUERIES = [
  {
    query: "What are the 4 rules of direct supervision?",
    mustInclude: [
      "one up",
      "one down", 
      "arm's reach",
      "triple ok",
      "30 second",
      "LMC and blackout may not be preventable so its mandatory to follow the 4 Rules of Direct Supervision"
    ]
  },
  {
    query: "What are the four rules of direct supervision in freediving?",
    mustInclude: [
      "one up",
      "one down",
      "arm's reach", 
      "triple ok",
      "30 second",
      "LMC and blackout may not be preventable"
    ]
  },
  {
    query: "Tell me about direct supervision rules",
    mustInclude: [
      "one up",
      "one down",
      "arm's reach",
      "triple ok"
    ]
  }
];

const ENDPOINTS = [
  '/api/chat/general',
  '/api/openai/chat'
];

async function testEndpoint(endpoint, query, mustInclude) {
  try {
    console.log(`🧪 Testing: ${endpoint} with query: "${query.substring(0, 40)}..."`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        userId: endpoint.includes('openai') ? 'admin-daniel-koval' : 'test_user'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.assistantMessage?.content || data.response || '';
    
    if (!content) {
      throw new Error('No content in response');
    }

    const contentLower = content.toLowerCase();
    const missingTerms = mustInclude.filter(term => 
      !contentLower.includes(term.toLowerCase())
    );

    if (missingTerms.length > 0) {
      console.error(`❌ FAILED: Missing required terms: ${missingTerms.join(', ')}`);
      console.error(`Response: ${content.substring(0, 200)}...`);
      return false;
    }

    console.log(`✅ PASSED: All required terms found`);
    return true;
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return false;
  }
}

async function runCanonicalSafetyTest() {
  console.log('🛡️ CANONICAL SAFETY RULES REGRESSION TEST');
  console.log('==========================================');
  
  let totalTests = 0;
  let passedTests = 0;

  for (const endpoint of ENDPOINTS) {
    console.log(`\n📡 Testing endpoint: ${endpoint}`);
    
    for (const testCase of SAFETY_QUERIES) {
      totalTests++;
      const passed = await testEndpoint(endpoint, testCase.query, testCase.mustInclude);
      if (passed) {
        passedTests++;
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n📊 RESULTS: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED - Canonical safety content is being returned correctly!');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED - Generic content may be returned instead of canonical');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runCanonicalSafetyTest().catch(console.error);
}

module.exports = { runCanonicalSafetyTest };
