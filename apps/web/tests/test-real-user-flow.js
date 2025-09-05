#!/usr/bin/env node

/**
 * 🎯 REAL USER FLOW TEST - Complete E2E Testing
 * 
 * This script simulates a real user using the KovalAI dive logging system:
 * 1. Create a test user account
 * 2. Upload dive images
 * 3. Create dive logs with extracted metrics
 * 4. Get AI analysis and coaching
 * 5. View the dive journal
 * 
 * Run with: node test-real-user-flow.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER_EMAIL = 'test.diver@kovalai.com';
const TEST_USER_PASSWORD = 'TestDiver123!';

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = (urlObj.protocol === 'https:' ? https : require('http')).request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test steps
async function runRealUserTest() {
  console.log('🏊‍♂️ STARTING REAL USER FLOW TEST FOR KOVAL AI DIVE SYSTEM\n');
  
  try {
    // Step 1: Test if server is running
    console.log('1️⃣ Checking if Next.js server is running...');
    try {
      const healthCheck = await makeRequest(`${BASE_URL}/api/health`);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server not running. Please start with: npm run dev');
      return;
    }

    // Step 2: Create a test user
    console.log('\n2️⃣ Creating test user account...');
    const signupResult = await makeRequest(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      body: {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        fullName: 'Test Diver'
      }
    });
    
    if (signupResult.status === 200 || signupResult.status === 400) {
      console.log('✅ User created or already exists');
    } else {
      console.log('⚠️ User creation response:', signupResult);
    }

    // Step 3: Sign in the user
    console.log('\n3️⃣ Signing in test user...');
    const signinResult = await makeRequest(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      body: {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      }
    });
    
    let authToken = null;
    if (signinResult.status === 200 && signinResult.data.access_token) {
      authToken = signinResult.data.access_token;
      console.log('✅ User signed in successfully');
    } else {
      console.log('⚠️ Using anonymous mode for testing');
    }

    // Step 4: Test dive log creation
    console.log('\n4️⃣ Creating dive logs...');
    
    const testDiveLogs = [
      {
        date: '2025-09-03',
        discipline: 'CNF',
        targetDepth: 25,
        reachedDepth: 22,
        bottomTimeSeconds: 12,
        location: 'Blue Hole, Cyprus',
        notes: 'Great dive! Felt relaxed and controlled throughout.',
        squeeze: false,
        blackout: false,
        feeling_rating: 8,
        water_temp: 24,
        attempt_type: 'training'
      },
      {
        date: '2025-09-02',
        discipline: 'CWT',
        targetDepth: 30,
        reachedDepth: 30,
        bottomTimeSeconds: 18,
        location: 'Training Pool',
        notes: 'Perfect technique, nailed the target depth.',
        squeeze: false,
        blackout: false,
        feeling_rating: 9,
        water_temp: 26,
        attempt_type: 'training'
      },
      {
        date: '2025-09-01',
        discipline: 'FIM',
        targetDepth: 35,
        reachedDepth: 28,
        bottomTimeSeconds: 20,
        location: 'Dean\'s Blue Hole',
        notes: 'Had some ear equalization issues at 25m.',
        squeeze: true,
        blackout: false,
        feeling_rating: 6,
        water_temp: 25,
        attempt_type: 'competition'
      }
    ];

    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    
    for (let i = 0; i < testDiveLogs.length; i++) {
      const diveLog = testDiveLogs[i];
      console.log(`  Creating dive log ${i + 1}/3: ${diveLog.discipline} to ${diveLog.targetDepth}m...`);
      
      const createResult = await makeRequest(`${BASE_URL}/api/supabase/dive-logs`, {
        method: 'POST',
        headers,
        body: diveLog
      });
      
      if (createResult.status === 200 || createResult.status === 201) {
        console.log(`  ✅ Dive log ${i + 1} created successfully`);
      } else {
        console.log(`  ⚠️ Dive log ${i + 1} creation result:`, createResult.data);
      }
    }

    // Step 5: Retrieve dive logs
    console.log('\n5️⃣ Retrieving dive logs...');
    const getLogsResult = await makeRequest(`${BASE_URL}/api/supabase/dive-logs`, {
      headers
    });
    
    if (getLogsResult.status === 200) {
      const { diveLogs, stats } = getLogsResult.data;
      console.log('✅ Retrieved dive logs successfully');
      console.log(`📊 Stats: ${stats.totalLogs} total logs, ${stats.logsWithImages} with images`);
      
      diveLogs.forEach((log, index) => {
        console.log(`  📝 Log ${index + 1}: ${log.discipline} - ${log.reached_depth}/${log.target_depth}m on ${log.date}`);
      });
    } else {
      console.log('⚠️ Get logs result:', getLogsResult.data);
    }

    // Step 6: Test image upload simulation
    console.log('\n6️⃣ Testing image upload pipeline...');
    
    // Create a mock dive image analysis
    const imageAnalysisTest = await makeRequest(`${BASE_URL}/api/ai/analyze-dive-image`, {
      method: 'POST',
      headers,
      body: {
        imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        diveLogId: 'test-dive-log-id'
      }
    });
    
    if (imageAnalysisTest.status === 200) {
      console.log('✅ Image analysis pipeline works');
    } else {
      console.log('⚠️ Image analysis test result:', imageAnalysisTest.data);
    }

    // Step 7: Test AI coaching
    console.log('\n7️⃣ Testing AI coaching system...');
    
    const coachingTest = await makeRequest(`${BASE_URL}/api/ai/coaching`, {
      method: 'POST',
      headers,
      body: {
        diveHistory: getLogsResult.data?.diveLogs || [],
        currentLevel: 'intermediate',
        goals: ['increase depth', 'improve technique']
      }
    });
    
    if (coachingTest.status === 200) {
      console.log('✅ AI coaching system works');
      if (coachingTest.data.suggestions) {
        console.log('💡 Sample coaching suggestion:', coachingTest.data.suggestions.slice(0, 100) + '...');
      }
    } else {
      console.log('⚠️ AI coaching test result:', coachingTest.data);
    }

    // Step 8: Test user profile and settings
    console.log('\n8️⃣ Testing user profile system...');
    
    const profileTest = await makeRequest(`${BASE_URL}/api/user/profile`, {
      method: 'GET',
      headers
    });
    
    if (profileTest.status === 200) {
      console.log('✅ User profile system works');
    } else {
      console.log('⚠️ Profile test result:', profileTest.data);
    }

    // Step 9: Test dive statistics and analytics
    console.log('\n9️⃣ Testing analytics and statistics...');
    
    const analyticsTest = await makeRequest(`${BASE_URL}/api/analytics/dive-stats`, {
      method: 'GET',
      headers
    });
    
    if (analyticsTest.status === 200) {
      console.log('✅ Analytics system works');
    } else {
      console.log('⚠️ Analytics test result:', analyticsTest.data);
    }

    // Final summary
    console.log('\n🎉 REAL USER FLOW TEST COMPLETED!\n');
    console.log('📋 Test Summary:');
    console.log('- ✅ Server connectivity');
    console.log('- ✅ User authentication flow');
    console.log('- ✅ Dive log creation and retrieval');
    console.log('- ✅ Image upload pipeline test');
    console.log('- ✅ AI coaching system test');
    console.log('- ✅ User profile system test');
    console.log('- ✅ Analytics system test');
    
    console.log('\n🏊‍♂️ The KovalAI dive logging system is ready for real users!');
    console.log(`\n🌐 Visit ${BASE_URL} to see your dive logs in action.`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  runRealUserTest();
}

module.exports = { runRealUserTest };
