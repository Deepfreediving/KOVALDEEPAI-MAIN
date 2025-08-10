#!/usr/bin/env node

/**
 * LOOP-BREAKER DIAGNOSTIC
 * Run this to identify the exact issue preventing deployment
 */

const https = require('https');
const http = require('http');

console.log('🔍 LOOP-BREAKER DIAGNOSTIC\n');
console.log('This will identify the EXACT issue preventing your app from working.\n');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runDiagnostic() {
  const results = {
    wixBackend: null,
    userMemory: null,
    authentication: null,
    appCollections: null
  };

  // Test 1: Wix Backend Deployment
  console.log('🔍 Test 1: Checking Wix backend deployment...');
  try {
    const response = await makeRequest('https://www.deepfreediving.com/_functions/userMemory', {
      method: 'OPTIONS',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 200 || response.status === 405) {
      console.log('✅ Wix backend is deployed and accessible');
      results.wixBackend = 'WORKING';
    } else {
      console.log(`❌ Wix backend issue: HTTP ${response.status}`);
      results.wixBackend = `ERROR_${response.status}`;
    }
  } catch (error) {
    console.log('❌ Wix backend not accessible:', error.message);
    results.wixBackend = 'NOT_DEPLOYED';
  }

  // Test 2: UserMemory Function Test
  console.log('\n🔍 Test 2: Testing UserMemory save function...');
  try {
    const testData = JSON.stringify({
      userId: 'test-user',
      key: 'test-data',
      data: { test: true, timestamp: new Date().toISOString() }
    });

    const response = await makeRequest('https://www.deepfreediving.com/_functions/userMemory', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Content-Length': testData.length
      },
      body: testData
    });

    if (response.status === 200) {
      console.log('✅ UserMemory function working');
      results.userMemory = 'WORKING';
    } else {
      console.log(`❌ UserMemory function error: HTTP ${response.status}`);
      console.log('Response:', response.data.substring(0, 200));
      results.userMemory = `ERROR_${response.status}`;
    }
  } catch (error) {
    console.log('❌ UserMemory function failed:', error.message);
    results.userMemory = 'FAILED';
  }

  // Test 3: Member Profile Function
  console.log('\n🔍 Test 3: Testing member profile function...');
  try {
    const response = await makeRequest('https://www.deepfreediving.com/_functions/getUserProfile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test-user' })
    });

    if (response.status === 200) {
      console.log('✅ Member profile function working');
      results.authentication = 'WORKING';
    } else {
      console.log(`❌ Member profile function error: HTTP ${response.status}`);
      results.authentication = `ERROR_${response.status}`;
    }
  } catch (error) {
    console.log('❌ Member profile function failed:', error.message);
    results.authentication = 'FAILED';
  }

  // Test 4: Next.js API Connection
  console.log('\n🔍 Test 4: Testing Next.js API connection...');
  try {
    const response = await makeRequest('https://kovaldeepai-main.vercel.app/api/wix/connection-test');
    
    if (response.status === 200) {
      console.log('✅ Next.js API accessible');
    } else {
      console.log(`⚠️ Next.js API issue: HTTP ${response.status}`);
    }
  } catch (error) {
    console.log('⚠️ Next.js API connection issue:', error.message);
  }

  // Results Summary
  console.log('\n📋 DIAGNOSTIC RESULTS');
  console.log('====================');
  console.log(`Wix Backend: ${results.wixBackend}`);
  console.log(`UserMemory Function: ${results.userMemory}`);
  console.log(`Authentication: ${results.authentication}`);

  // Recommendations
  console.log('\n🎯 NEXT ACTIONS BASED ON RESULTS');
  console.log('================================');

  if (results.wixBackend === 'NOT_DEPLOYED') {
    console.log('🚨 CRITICAL: Wix backend functions are NOT deployed!');
    console.log('ACTION: Go to Wix Editor → Dev Mode → Backend');
    console.log('        Upload userMemory.jsw and memberProfile.jsw');
    console.log('        PUBLISH the site');
  } else if (results.wixBackend.startsWith('ERROR_500')) {
    console.log('🚨 CRITICAL: Wix backend functions have runtime errors!');
    console.log('ACTION: Check Wix console logs for JavaScript errors');
    console.log('        Verify backend function syntax');
  } else if (results.userMemory === 'FAILED') {
    console.log('🚨 CRITICAL: UserMemory function not working!');
    console.log('ACTION: Enable App Collections in Wix CMS');
    console.log('        Check userMemory API imports in backend');
  } else if (results.authentication === 'FAILED') {
    console.log('⚠️ Authentication pipeline broken');
    console.log('ACTION: Fix user profile extraction in memberProfile.jsw');
  } else if (results.wixBackend === 'WORKING' && results.userMemory === 'WORKING') {
    console.log('✅ Backend is working! Issue is in frontend integration');
    console.log('ACTION: Check widget user data passing');
    console.log('        Test embed.jsx authentication flow');
  }

  // Files to check based on results
  console.log('\n📁 FILES TO CHECK:');
  if (results.wixBackend === 'NOT_DEPLOYED') {
    console.log('- Deploy: wix-site/wix-app/backend/userMemory.jsw');
    console.log('- Deploy: wix-site/wix-app/backend/memberProfile.jsw');
  }
  if (results.userMemory === 'FAILED') {
    console.log('- Check: Wix CMS → App Collections → UserMemory');
  }
  if (results.authentication === 'FAILED') {
    console.log('- Check: wix-site/wix-page/wix-frontend-page.js');
    console.log('- Check: public/bot-widget.js');
  }

  console.log('\n⏰ Run this diagnostic again after making changes to track progress.');
}

// Run the diagnostic
runDiagnostic().catch(error => {
  console.error('💥 Diagnostic failed:', error);
  console.log('\n🔧 Manual check needed:');
  console.log('1. Open https://www.deepfreediving.com in browser');
  console.log('2. Check browser console for errors');
  console.log('3. Verify Wix site is published');
});
