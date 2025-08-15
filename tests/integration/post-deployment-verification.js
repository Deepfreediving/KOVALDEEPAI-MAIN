// 🔧 POST-DEPLOYMENT VERIFICATION SCRIPT
// Purpose: Verify Wix backend functions after deployment
// Version: 1.0 - August 15, 2025

const axios = require('axios');

const WIX_SITE_URL = 'https://www.deepfreediving.com';

console.log('🔧 POST-DEPLOYMENT VERIFICATION STARTING...\n');

// Test 1: Basic function availability
async function testBasicAvailability() {
    console.log('📋 TESTING BASIC FUNCTION AVAILABILITY...');
    
    const functions = ['testBackend', 'saveDiveLog', 'diveLogs', 'getUserProfile', 'chat', 'userMemory'];
    
    for (const func of functions) {
        try {
            const response = await axios.post(`${WIX_SITE_URL}/_functions/${func}`, {
                test: true
            }, {
                timeout: 10000,
                validateStatus: function (status) {
                    return status < 600; // Accept all statuses
                }
            });
            
            if (response.status === 200) {
                console.log(`✅ ${func}: DEPLOYED AND WORKING (${response.status})`);
            } else if (response.status === 500) {
                const errorDetails = response.headers['x-wix-code-user-error-details'];
                if (errorDetails && errorDetails.includes('MODULE_LOAD_ERROR')) {
                    console.log(`❌ ${func}: NOT DEPLOYED OR SYNTAX ERROR (${response.status})`);
                } else {
                    console.log(`⚠️  ${func}: DEPLOYED BUT RUNTIME ERROR (${response.status})`);
                }
            } else {
                console.log(`⚠️  ${func}: UNEXPECTED STATUS (${response.status})`);
            }
            
        } catch (error) {
            console.log(`❌ ${func}: CONNECTION ERROR - ${error.message}`);
        }
    }
    console.log('');
}

// Test 2: Functional testing with real data
async function testFunctionalBehavior() {
    console.log('🧪 TESTING FUNCTIONAL BEHAVIOR...');
    
    // Test saveDiveLog with real data
    try {
        console.log('  Testing saveDiveLog with sample data...');
        const response = await axios.post(`${WIX_SITE_URL}/_functions/saveDiveLog`, {
            userId: 'test-user-verification',
            diveLogId: `verification-${Date.now()}`,
            logEntry: JSON.stringify({
                depth: '20m',
                time: '2:00',
                notes: 'Post-deployment verification test'
            }),
            diveDate: new Date().toISOString()
        }, {
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`  ✅ saveDiveLog functional test: SUCCESS (${response.status})`);
        
    } catch (error) {
        console.log(`  ❌ saveDiveLog functional test: FAILED (${error.response?.status || error.message})`);
    }
    
    // Test getUserProfile
    try {
        console.log('  Testing getUserProfile...');
        const response = await axios.post(`${WIX_SITE_URL}/_functions/getUserProfile`, {
            userId: 'test-user-verification'
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`  ✅ getUserProfile functional test: SUCCESS (${response.status})`);
        
    } catch (error) {
        console.log(`  ❌ getUserProfile functional test: FAILED (${error.response?.status || error.message})`);
    }
    
    console.log('');
}

// Test 3: Integration testing
async function testIntegration() {
    console.log('🔗 TESTING FRONTEND-BACKEND INTEGRATION...');
    
    try {
        // Test if frontend can reach backend
        const vercelResponse = await axios.get('https://kovaldeepai-main.vercel.app/api/health');
        console.log(`✅ Vercel backend: HEALTHY (${vercelResponse.status})`);
        
        // Test CORS from Vercel to Wix
        const corsTest = await axios.post(`${WIX_SITE_URL}/_functions/testBackend`, {
            source: 'vercel-integration-test'
        }, {
            headers: {
                'Origin': 'https://kovaldeepai-main.vercel.app',
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`✅ CORS integration: WORKING (${corsTest.status})`);
        
    } catch (error) {
        console.log(`❌ Integration test failed: ${error.response?.status || error.message}`);
    }
    
    console.log('');
}

// Test 4: Generate final report
function generateReport() {
    console.log('📊 DEPLOYMENT VERIFICATION COMPLETE');
    console.log('');
    console.log('🎯 NEXT STEPS:');
    console.log('1. If all functions show ✅ - deployment successful!');
    console.log('2. If any show ❌ MODULE_LOAD_ERROR - redeploy those functions');
    console.log('3. If any show ⚠️  RUNTIME ERROR - check function logic');
    console.log('4. Test live site: https://www.deepfreediving.com/large-koval-deep-ai-page');
    console.log('');
    console.log('🔍 For debugging, check browser console and network tab');
}

// Run all verification tests
async function runVerification() {
    await testBasicAvailability();
    await testFunctionalBehavior();
    await testIntegration();
    generateReport();
}

runVerification();
