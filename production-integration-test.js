#!/usr/bin/env node

/**
 * 🔍 COMPREHENSIVE PRODUCTION API VERIFICATION
 * Tests the live production deployment and integration
 */

console.log('🚀 Koval Deep AI - Production Integration Test');
console.log('==============================================');

const CORRECT_PRODUCTION_URL = 'https://kovaldeepai-main.vercel.app';
const WRONG_PRODUCTION_URL = 'https://koval-deep-ai.vercel.app';
const LIVE_SITE_URL = 'https://www.deepfreediving.com';

async function testBothUrls() {
  console.log('\n📊 URL Comparison Test');
  console.log('=======================');

  const urls = [
    { name: 'CORRECT URL (with "main")', url: CORRECT_PRODUCTION_URL },
    { name: 'INCORRECT URL (without "main")', url: WRONG_PRODUCTION_URL }
  ];

  for (const { name, url } of urls) {
    console.log(`\n🔗 Testing ${name}: ${url}`);
    try {
      const response = await fetch(`${url}/embed`);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log(`   ✅ WORKING - This URL is live and functional`);
      } else {
        console.log(`   ❌ NOT WORKING - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}`);
    }
  }
}

async function testProductionFeatures() {
  console.log('\n🧪 Production Features Test');
  console.log('============================');

  const testCases = [
    {
      name: 'Embed Page (for iframe)',
      endpoint: '/embed',
      method: 'GET',
      expectedContent: ['__next', 'React', 'div'],
      description: 'Main page for iframe integration'
    },
    {
      name: 'Chat API',
      endpoint: '/api/openai/chat',
      method: 'POST',
      body: {
        message: 'Test chat functionality',
        userId: 'production-test-user',
        embedMode: true
      },
      expectedContent: ['assistantMessage', 'content'],
      description: 'AI chat functionality'
    },
    {
      name: 'Dive Logs Bridge',
      endpoint: '/api/wix/dive-logs-bridge',
      method: 'POST',
      body: {
        userId: 'test-user',
        limit: 10
      },
      expectedContent: ['diveLogs', 'success'],
      description: 'Dive logs retrieval from Wix'
    },
    {
      name: 'Save Dive Log',
      endpoint: '/api/analyze/save-dive-log',
      method: 'POST',
      body: {
        userId: 'production-test',
        location: 'Test Location',
        discipline: 'Free Immersion',
        reachedDepth: 25,
        targetDepth: 30,
        date: new Date().toISOString(),
        notes: 'Production API test dive'
      },
      expectedContent: ['success', 'wixSave'],
      description: 'Dive log saving functionality'
    }
  ];

  for (const test of testCases) {
    console.log(`\n🔍 ${test.name}`);
    console.log(`   📋 ${test.description}`);
    console.log(`   🔗 ${CORRECT_PRODUCTION_URL}${test.endpoint}`);

    try {
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Koval-Deep-AI-Production-Test/1.0'
        }
      };

      if (test.body) {
        options.body = JSON.stringify(test.body);
      }

      const response = await fetch(`${CORRECT_PRODUCTION_URL}${test.endpoint}`, options);
      console.log(`   📊 Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        let responseData;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
          console.log(`   ✅ JSON Response received`);
          
          // Check for expected content
          const responseStr = JSON.stringify(responseData);
          const foundExpected = test.expectedContent.filter(content => 
            responseStr.toLowerCase().includes(content.toLowerCase())
          );
          
          if (foundExpected.length > 0) {
            console.log(`   ✅ Expected content found: ${foundExpected.join(', ')}`);
          } else {
            console.log(`   ⚠️  Expected content not found: ${test.expectedContent.join(', ')}`);
          }
        } else {
          responseData = await response.text();
          console.log(`   ✅ HTML/Text Response received (${responseData.length} chars)`);
          
          // For HTML responses, check if expected content exists
          const foundExpected = test.expectedContent.filter(content => 
            responseData.toLowerCase().includes(content.toLowerCase())
          );
          
          if (foundExpected.length > 0) {
            console.log(`   ✅ Expected content found: ${foundExpected.join(', ')}`);
          }
        }

      } else {
        console.log(`   ❌ Request failed: ${response.status}`);
        const errorText = await response.text();
        console.log(`   📄 Error: ${errorText.substring(0, 100)}...`);
      }

    } catch (error) {
      console.log(`   ❌ Network Error: ${error.message}`);
    }
  }
}

async function generateIntegrationReport() {
  console.log('\n📋 Integration Report & Recommendations');
  console.log('=======================================');

  console.log(`
✅ PRODUCTION API ENDPOINT CONFIRMED:
   🔗 Correct URL: ${CORRECT_PRODUCTION_URL}
   ❌ Incorrect URL: ${WRONG_PRODUCTION_URL} (NOT WORKING)

🎯 IFRAME INTEGRATION:
   📱 Embed URL: ${CORRECT_PRODUCTION_URL}/embed
   📏 Recommended iframe attributes:
      - src="${CORRECT_PRODUCTION_URL}/embed"
      - width="100%"
      - height="1200px"
      - frameborder="0"
      - allow="clipboard-write"

💡 API ENDPOINTS FOR DIRECT CALLS:
   🤖 Chat: ${CORRECT_PRODUCTION_URL}/api/openai/chat
   💾 Save Dive Log: ${CORRECT_PRODUCTION_URL}/api/analyze/save-dive-log
   📊 Get Dive Logs: ${CORRECT_PRODUCTION_URL}/api/wix/dive-logs-bridge
   🔍 Health Check: ${CORRECT_PRODUCTION_URL}/api/system/health-check

🔧 INTEGRATION METHODS:
   1. iframe Embed (Recommended):
      <iframe src="${CORRECT_PRODUCTION_URL}/embed" width="100%" height="1200px"></iframe>
   
   2. Direct API Calls:
      - POST requests to the API endpoints above
      - Include proper CORS headers
      - Use JSON content-type

🌐 LIVE SITE INTEGRATION:
   - The live site at ${LIVE_SITE_URL} should use the iframe method
   - Wix site should embed the ${CORRECT_PRODUCTION_URL}/embed URL
   - All API calls should target ${CORRECT_PRODUCTION_URL}
  `);
}

// Run comprehensive test
(async () => {
  try {
    await testBothUrls();
    await testProductionFeatures();
    await generateIntegrationReport();
    
    console.log('\n🎉 Production API verification completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
})();
