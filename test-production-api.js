#!/usr/bin/env node

/**
 * Production API Test for Critical Issues
 */

const https = require('https');

console.log('🚀 TESTING PRODUCTION API ENDPOINTS');
console.log('====================================\n');

// Test 1: Chat API with nickname
console.log('1️⃣ Testing Chat API with nickname...');

const testChatWithNickname = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      message: 'Hello, can you analyze my freediving performance?',
      nickname: 'TestUser',
      embedMode: true,
      profile: {
        firstName: 'Test',
        lastName: 'User',
        nickname: 'TestUser'
      }
    });

    const options = {
      hostname: 'kovaldeepai-main.vercel.app',
      port: 443,
      path: '/api/openai/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Response: ${result.assistantMessage?.content?.substring(0, 100)}...`);
          
          if (result.assistantMessage?.content === 'I received your message!') {
            console.log('   ❌ ISSUE: AI only saying "I received your message!"');
          } else if (result.assistantMessage?.content?.length > 50) {
            console.log('   ✅ AI providing proper analysis response');
          }
          
          resolve(result);
        } catch (e) {
          console.log(`   ❌ JSON Parse Error: ${e.message}`);
          console.log(`   Raw response: ${data.substring(0, 200)}`);
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.log(`   ❌ Request Error: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
};

// Test 2: Single dive log analysis
console.log('\n2️⃣ Testing Single Dive Log Analysis with nickname...');

const testDiveLogAnalysis = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      nickname: 'TestUser',
      diveLogData: {
        id: `test_${Date.now()}`,
        date: new Date().toISOString(),
        discipline: 'CWT',
        targetDepth: 30,
        reachedDepth: 28,
        location: 'Test Pool',
        notes: 'Test dive for debugging'
      }
    });

    const options = {
      hostname: 'kovaldeepai-main.vercel.app',
      port: 443,
      path: '/api/analyze/single-dive-log',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Success: ${result.success}`);
          console.log(`   Analysis Length: ${result.analysis?.length || 0} chars`);
          
          if (result.success && result.analysis && result.analysis.length > 50) {
            console.log('   ✅ Dive log analysis working properly');
          } else {
            console.log('   ❌ ISSUE: Dive log analysis not working');
          }
          
          resolve(result);
        } catch (e) {
          console.log(`   ❌ JSON Parse Error: ${e.message}`);
          console.log(`   Raw response: ${data.substring(0, 200)}`);
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.log(`   ❌ Request Error: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
};

// Test 3: Health check
console.log('\n3️⃣ Testing API Health...');

const testHealthCheck = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'kovaldeepai-main.vercel.app',
      port: 443,
      path: '/api/system/health-check',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   OpenAI: ${result.openai?.status || 'Unknown'}`);
          console.log(`   Pinecone: ${result.pinecone?.status || 'Unknown'}`);
          resolve(result);
        } catch (e) {
          console.log(`   Raw response: ${data.substring(0, 200)}`);
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (e) => {
      console.log(`   ❌ Request Error: ${e.message}`);
      reject(e);
    });

    req.end();
  });
};

// Run all tests
(async () => {
  try {
    await testChatWithNickname();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    await testDiveLogAnalysis();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    await testHealthCheck();
    
    console.log('\n✅ Production API tests completed');
    console.log('📋 Check the above results for any critical issues');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
})();
