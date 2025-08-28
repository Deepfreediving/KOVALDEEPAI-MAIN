#!/usr/bin/env node

/**
 * Frontend API Test - Test the optimized dive-logs API endpoint
 * This simulates what the frontend would call
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.VERCEL_URL || 'http://localhost:3000';
const TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Admin user
const TEST_NICKNAME = 'daniel_koval';

console.log('🧪 Testing Frontend API Endpoint...');
console.log(`📍 Base URL: ${BASE_URL}`);

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.get(url, {
      timeout: 15000, // 15 second timeout
      headers: {
        'User-Agent': 'FrontendTest/1.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testEndpoint(testName, endpoint) {
  console.log(`\n🧪 ${testName}`);
  console.log(`📡 ${endpoint}`);
  
  try {
    const response = await makeRequest(endpoint);
    
    console.log(`✅ Status: ${response.statusCode}`);
    console.log(`⏱️ Response Time: ${response.responseTime}ms`);
    
    if (response.statusCode === 200) {
      try {
        const data = JSON.parse(response.body);
        console.log(`📊 Dive Logs Found: ${data.diveLogs?.length || 0}`);
        console.log(`📸 Logs with Images: ${data.stats?.logsWithImages || 0}`);
        console.log(`⚡ Processing Time: ${data.meta?.processingTime || 'N/A'}ms`);
        console.log(`🔧 Optimized: ${data.meta?.optimized || false}`);
        
        if (data.diveLogs?.length > 0) {
          const firstLog = data.diveLogs[0];
          console.log(`📋 Sample Log: ${firstLog.date} - ${firstLog.discipline} - ${firstLog.location}`);
          console.log(`🖼️ Has Image: ${firstLog.hasImage}`);
          if (firstLog.hasImage && firstLog.imageUrl) {
            console.log(`🔗 Image URL: ${firstLog.imageUrl.substring(0, 60)}...`);
          }
        }
        
        return { success: true, data, responseTime: response.responseTime };
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError.message);
        console.log('📝 Raw Response:', response.body.substring(0, 200));
        return { success: false, error: 'JSON Parse Error', responseTime: response.responseTime };
      }
    } else {
      console.error(`❌ HTTP Error ${response.statusCode}`);
      console.log('📝 Response:', response.body.substring(0, 200));
      return { success: false, error: `HTTP ${response.statusCode}`, responseTime: response.responseTime };
    }
  } catch (error) {
    console.error(`❌ Request Error: ${error.message}`);
    return { success: false, error: error.message, responseTime: null };
  }
}

async function runTests() {
  console.log('🚀 Starting Frontend API Tests...\n');
  
  const tests = [
    {
      name: 'Test with Admin User ID',
      endpoint: `${BASE_URL}/api/supabase/dive-logs-optimized?userId=${TEST_USER_ID}&limit=10`
    },
    {
      name: 'Test with Admin Nickname',
      endpoint: `${BASE_URL}/api/supabase/dive-logs-optimized?nickname=${TEST_NICKNAME}&limit=10`
    },
    {
      name: 'Test with Limit 5',
      endpoint: `${BASE_URL}/api/supabase/dive-logs-optimized?userId=${TEST_USER_ID}&limit=5`
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.endpoint);
    results.push({ ...test, ...result });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    const avgResponseTime = successful
      .filter(r => r.responseTime)
      .reduce((acc, r) => acc + r.responseTime, 0) / successful.filter(r => r.responseTime).length;
    console.log(`⏱️ Average Response Time: ${Math.round(avgResponseTime)}ms`);
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    failed.forEach(test => {
      console.log(`  - ${test.name}: ${test.error}`);
    });
  }
  
  console.log('\n🏁 Frontend API Test Complete!');
  
  // Exit with appropriate code
  process.exit(failed.length > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});
