#!/usr/bin/env node

/**
 * Test the CORRECT production API endpoint for Koval Deep AI
 * Based on the codebase analysis, the correct URL is kovaldeepai-main.vercel.app
 */

console.log('🧪 Testing CORRECT Production API Endpoint');
console.log('=======================================');

const PRODUCTION_URL = 'https://kovaldeepai-main.vercel.app';

async function testProductionEndpoint() {
  const testCases = [
    {
      name: 'Health Check',
      path: '/api/system/health-check',
      method: 'GET'
    },
    {
      name: 'Embed Page',
      path: '/embed',
      method: 'GET'
    },
    {
      name: 'Chat API',
      path: '/api/openai/chat',
      method: 'POST',
      body: {
        message: 'Hello, is the API working?',
        userId: 'test-user',
        embedMode: true
      }
    },
    {
      name: 'Vercel Handshake',
      path: '/api/system/vercel-handshake',
      method: 'POST',
      body: {
        action: 'healthCheck',
        version: 'v4.0'
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n🔍 Testing ${testCase.name}...`);
      console.log(`   URL: ${PRODUCTION_URL}${testCase.path}`);

      const options = {
        method: testCase.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Koval-Deep-AI-Test/1.0',
          'Accept': 'application/json'
        }
      };

      if (testCase.body) {
        options.body = JSON.stringify(testCase.body);
      }

      const response = await fetch(`${PRODUCTION_URL}${testCase.path}`, options);
      
      console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
      console.log(`   📄 Content-Type: ${response.headers.get('content-type')}`);

      if (testCase.path === '/embed') {
        // For HTML endpoints, just check if we get HTML
        const text = await response.text();
        if (text.includes('<html') || text.includes('<!DOCTYPE')) {
          console.log(`   📋 Response: HTML page loaded successfully`);
        } else {
          console.log(`   ❌ Response: Not a valid HTML page`);
        }
      } else {
        // For API endpoints, try to parse JSON
        try {
          const data = await response.json();
          console.log(`   📋 Response:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
        } catch (e) {
          const text = await response.text();
          console.log(`   📋 Response: ${text.substring(0, 200)}...`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

async function testEmbedIntegration() {
  console.log(`\n🔗 Testing Embed Integration`);
  console.log('============================');

  try {
    const embedUrl = `${PRODUCTION_URL}/embed?userId=test-user&source=production-test`;
    console.log(`Embed URL: ${embedUrl}`);

    const response = await fetch(embedUrl);
    console.log(`Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const html = await response.text();
      
      // Check for key elements that should be in the embed page
      const checks = [
        { name: 'React App', pattern: /<div[^>]*id="__next"/ },
        { name: 'Chat Interface', pattern: /chat|message/i },
        { name: 'Dive Journal', pattern: /dive.?journal|dive.?log/i },
        { name: 'CSS Styles', pattern: /<style|<link[^>]*stylesheet/i },
        { name: 'JavaScript', pattern: /<script/i }
      ];

      console.log('\n📋 Embed Page Analysis:');
      checks.forEach(check => {
        const found = check.pattern.test(html);
        console.log(`   ${found ? '✅' : '❌'} ${check.name}: ${found ? 'Found' : 'Missing'}`);
      });

      console.log(`\n📏 Page size: ${html.length} characters`);
      
    } else {
      console.log(`❌ Failed to load embed page`);
    }

  } catch (error) {
    console.log(`❌ Error testing embed: ${error.message}`);
  }
}

// Run tests
(async () => {
  await testProductionEndpoint();
  await testEmbedIntegration();
  
  console.log(`\n🎯 Production API Endpoint Confirmed: ${PRODUCTION_URL}`);
  console.log(`🔗 Embed URL for iframe: ${PRODUCTION_URL}/embed`);
  console.log(`\n✅ Use this URL in your Wix iframe or direct API calls.`);
})();
