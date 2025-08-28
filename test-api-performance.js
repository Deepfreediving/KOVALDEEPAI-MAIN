#!/usr/bin/env node
/**
 * Performance Test Script for Dive Logs API
 * Tests the optimized vs original API endpoints
 */

require('dotenv').config({ path: '.env.local' });

const VERCEL_URL = 'https://kovaldeepai-main.vercel.app';
const LOCAL_URL = 'http://localhost:3002';
const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

async function testAPIPerformance() {
  console.log('🧪 Testing API Performance - Dive Logs\n');

  const testConfigurations = [
    {
      name: 'Original API (Vercel)',
      url: `${VERCEL_URL}/api/supabase/dive-logs?userId=${ADMIN_USER_ID}`,
      timeout: 10000
    },
    {
      name: 'Optimized API (Local)',
      url: `${LOCAL_URL}/api/supabase/dive-logs-optimized?userId=${ADMIN_USER_ID}`,
      timeout: 10000
    }
  ];

  for (const config of testConfigurations) {
    console.log(`\n🔍 Testing: ${config.name}`);
    console.log(`📍 URL: ${config.url}`);

    try {
      const startTime = Date.now();
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(config.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`⏱️  Response Time: ${responseTime}ms`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        
        console.log('✅ Success!');
        console.log(`📋 Dive Logs: ${data.diveLogs?.length || data.stats?.totalLogs || 'Unknown'}`);
        console.log(`📸 With Images: ${data.stats?.logsWithImages || 'Unknown'}`);
        
        if (data.meta) {
          console.log(`🚀 Processing Time: ${data.meta.processingTime}ms`);
          console.log(`🔧 Optimized: ${data.meta.optimized ? 'Yes' : 'No'}`);
          console.log(`👁️ View Used: ${data.meta.viewUsed || 'N/A'}`);
        }

        // Performance analysis
        if (responseTime < 1000) {
          console.log('🟢 Performance: Excellent (< 1s)');
        } else if (responseTime < 3000) {
          console.log('🟡 Performance: Good (1-3s)');
        } else if (responseTime < 10000) {
          console.log('🟠 Performance: Slow (3-10s)');
        } else {
          console.log('🔴 Performance: Very Slow (> 10s)');
        }

      } else {
        console.log('❌ Failed!');
        const errorText = await response.text();
        console.log(`Error: ${errorText.substring(0, 200)}...`);
      }

    } catch (error) {
      console.log('❌ Request Failed!');
      
      if (error.name === 'AbortError') {
        console.log('⏰ Request timed out');
      } else if (error.message.includes('ERR_INSUFFICIENT_RESOURCES')) {
        console.log('💥 ERR_INSUFFICIENT_RESOURCES - Server overloaded');
      } else if (error.message.includes('Failed to fetch')) {
        console.log('🌐 Network error - Server might be down');
      } else {
        console.log(`Error: ${error.message}`);
      }
    }

    console.log('─'.repeat(60));
  }

  // Test multiple concurrent requests
  console.log('\n🚀 Testing Concurrent Requests (Load Test)');
  console.log('Testing 5 concurrent requests to check resource usage...\n');

  const concurrentTests = Array(5).fill(0).map(async (_, index) => {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${LOCAL_URL}/api/supabase/dive-logs-optimized?userId=${ADMIN_USER_ID}`, {
        timeout: 5000
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        index: index + 1,
        success: response.ok,
        responseTime,
        status: response.status
      };
      
    } catch (error) {
      return {
        index: index + 1,
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  });

  try {
    const results = await Promise.all(concurrentTests);
    
    const successfulRequests = results.filter(r => r.success).length;
    const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    
    console.log(`✅ Successful requests: ${successfulRequests}/5`);
    console.log(`⏱️  Average response time: ${Math.round(averageResponseTime)}ms`);
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} Request ${result.index}: ${result.responseTime}ms ${result.error ? `(${result.error})` : ''}`);
    });

    if (successfulRequests === 5 && averageResponseTime < 2000) {
      console.log('\n🎉 Performance Test PASSED! API is stable and fast.');
    } else if (successfulRequests >= 3) {
      console.log('\n⚠️  Performance Test PARTIAL - Some issues detected.');
    } else {
      console.log('\n🚨 Performance Test FAILED - API has serious issues.');
    }

  } catch (error) {
    console.log('❌ Concurrent test failed:', error.message);
  }
}

// Run the test
testAPIPerformance().catch(console.error);
