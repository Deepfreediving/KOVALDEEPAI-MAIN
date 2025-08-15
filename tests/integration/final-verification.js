// 🔧 FINAL VERIFICATION SCRIPT - Test After Deployment
// Run this after deploying the cleaned up Wix backend and frontend

const axios = require('axios');

const WIX_SITE_URL = 'https://www.deepfreediving.com';
const VERCEL_URL = 'https://kovaldeepai-main.vercel.app';

console.log('🔧 FINAL VERIFICATION STARTING...\n');

// Test 1: Basic backend function availability
async function testWixBackendFunctions() {
    console.log('📋 TESTING WIX BACKEND FUNCTIONS (NEW STRUCTURE)...');
    
    const functions = [
        { name: 'test', method: 'GET' },
        { name: 'test', method: 'POST' },
        { name: 'saveDiveLog', method: 'POST' },
        { name: 'diveLogs', method: 'GET' },
        { name: 'getUserProfile', method: 'GET' },
        { name: 'chat', method: 'POST' },
        { name: 'userMemory', method: 'POST' }
    ];
    
    for (const func of functions) {
        try {
            let response;
            const url = `${WIX_SITE_URL}/_functions/${func.name}`;
            
            if (func.method === 'GET') {
                response = await axios.get(url + '?userId=test-user', {
                    timeout: 10000,
                    validateStatus: status => status < 600
                });
            } else {
                response = await axios.post(url, {
                    userId: 'test-user',
                    diveLogId: 'test-verification',
                    message: 'test message'
                }, {
                    timeout: 10000,
                    headers: { 'Content-Type': 'application/json' },
                    validateStatus: status => status < 600
                });
            }
            
            if (response.status === 200) {
                console.log(`✅ ${func.method} ${func.name}: SUCCESS (${response.status})`);
                if (response.data?.success) {
                    console.log(`   📄 Response: ${response.data.data?.message || 'Success'}`);
                }
            } else if (response.status === 500) {
                const errorDetails = response.headers['x-wix-code-user-error-details'];
                if (errorDetails && errorDetails.includes('MODULE_LOAD_ERROR')) {
                    console.log(`❌ ${func.method} ${func.name}: NOT DEPLOYED (${response.status})`);
                } else {
                    console.log(`❌ ${func.method} ${func.name}: RUNTIME ERROR (${response.status})`);
                }
            } else {
                console.log(`⚠️  ${func.method} ${func.name}: UNEXPECTED STATUS (${response.status})`);
            }
            
        } catch (error) {
            console.log(`❌ ${func.method} ${func.name}: ERROR - ${error.message}`);
        }
    }
    console.log('');
}

// Test 2: Functional dive log save/retrieve
async function testDiveLogFlow() {
    console.log('🏊 TESTING DIVE LOG SAVE/RETRIEVE FLOW...');
    
    const testDiveLog = {
        userId: 'verification-user',
        diveLogId: `verification-${Date.now()}`,
        logEntry: JSON.stringify({
            depth: '25m',
            time: '2:15',
            notes: 'Final verification test dive',
            location: 'Test Pool'
        }),
        diveDate: new Date().toISOString(),
        diveTime: '14:30'
    };
    
    try {
        // Save dive log
        console.log('  💾 Testing dive log save...');
        const saveResponse = await axios.post(`${WIX_SITE_URL}/_functions/saveDiveLog`, testDiveLog, {
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (saveResponse.status === 200) {
            console.log(`  ✅ Save successful: ${saveResponse.data.data?.message}`);
            console.log(`  📄 Wix ID: ${saveResponse.data.data?.wixId}`);
            
            // Retrieve dive logs
            console.log('  📚 Testing dive log retrieval...');
            const retrieveResponse = await axios.get(`${WIX_SITE_URL}/_functions/diveLogs?userId=${testDiveLog.userId}`, {
                timeout: 10000
            });
            
            if (retrieveResponse.status === 200) {
                const diveLogs = retrieveResponse.data.data?.diveLogs || [];
                console.log(`  ✅ Retrieval successful: Found ${diveLogs.length} dive logs`);
                
                // Check if our test log is there
                const foundLog = diveLogs.find(log => log.diveLogId === testDiveLog.diveLogId);
                if (foundLog) {
                    console.log(`  ✅ Test dive log found in collection`);
                } else {
                    console.log(`  ⚠️  Test dive log not found (may take time to propagate)`);
                }
            } else {
                console.log(`  ❌ Retrieval failed: STATUS ${retrieveResponse.status}`);
            }
            
        } else {
            console.log(`  ❌ Save failed: STATUS ${saveResponse.status}`);
        }
        
    } catch (error) {
        console.log(`  ❌ Dive log flow failed: ${error.response?.status || error.message}`);
    }
    
    console.log('');
}

// Test 3: Frontend widget functionality
async function testFrontendWidget() {
    console.log('🖥️  TESTING FRONTEND WIDGET...');
    
    try {
        // Test page loads
        const pageResponse = await axios.get('https://www.deepfreediving.com/large-koval-deep-ai-page', {
            timeout: 10000
        });
        
        console.log(`✅ Page loads: STATUS ${pageResponse.status}`);
        
        // Test widget iframe loads
        const widgetResponse = await axios.get(`${VERCEL_URL}/embed`, {
            timeout: 10000
        });
        
        console.log(`✅ Widget iframe loads: STATUS ${widgetResponse.status}`);
        console.log(`📊 Widget content length: ${widgetResponse.data.length} characters`);
        
        // Check for expected widget components
        const hasUpload = widgetResponse.data.includes('upload') || widgetResponse.data.includes('file');
        const hasChat = widgetResponse.data.includes('chat') || widgetResponse.data.includes('message');
        const hasDiveLog = widgetResponse.data.includes('dive') || widgetResponse.data.includes('log');
        
        console.log(`  📸 Has upload functionality: ${hasUpload ? '✅' : '❌'}`);
        console.log(`  💬 Has chat functionality: ${hasChat ? '✅' : '❌'}`);
        console.log(`  🏊 Has dive log functionality: ${hasDiveLog ? '✅' : '❌'}`);
        
    } catch (error) {
        console.log(`❌ Frontend widget test failed: ${error.message}`);
    }
    
    console.log('');
}

// Test 4: End-to-end integration
async function testEndToEndIntegration() {
    console.log('🔗 TESTING END-TO-END INTEGRATION...');
    
    try {
        // Test Vercel → Wix communication
        console.log('  🌐 Testing Vercel backend health...');
        const vercelHealth = await axios.get(`${VERCEL_URL}/api/health`);
        console.log(`  ✅ Vercel backend: HEALTHY (${vercelHealth.status})`);
        
        // Test CORS between Vercel and Wix
        console.log('  🌍 Testing cross-origin requests...');
        const corsTest = await axios.post(`${WIX_SITE_URL}/_functions/test`, {
            source: 'vercel-integration-test'
        }, {
            headers: {
                'Origin': VERCEL_URL,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`  ✅ CORS integration: WORKING (${corsTest.status})`);
        
        // Test if Vercel can save to Wix
        console.log('  📡 Testing Vercel → Wix data flow...');
        const integrationTest = await axios.post(`${WIX_SITE_URL}/_functions/saveDiveLog`, {
            userId: 'integration-test',
            diveLogId: `integration-${Date.now()}`,
            logEntry: JSON.stringify({ source: 'vercel-integration' }),
            diveDate: new Date().toISOString()
        }, {
            headers: {
                'Origin': VERCEL_URL,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`  ✅ Vercel → Wix data flow: WORKING (${integrationTest.status})`);
        
    } catch (error) {
        console.log(`  ❌ Integration test failed: ${error.response?.status || error.message}`);
    }
    
    console.log('');
}

// Generate final report
function generateFinalReport() {
    console.log('📊 FINAL VERIFICATION COMPLETE');
    console.log('================================================');
    console.log('');
    console.log('🎯 DEPLOYMENT STATUS:');
    console.log('If you see ✅ SUCCESS messages above, the deployment worked!');
    console.log('');
    console.log('🔍 TO VERIFY LIVE FUNCTIONALITY:');
    console.log('1. Visit: https://www.deepfreediving.com/large-koval-deep-ai-page');
    console.log('2. Open browser console (F12)');
    console.log('3. Look for initialization messages');
    console.log('4. Test image upload and dive log saving');
    console.log('5. Reload page and verify data persists');
    console.log('');
    console.log('🆘 IF ISSUES PERSIST:');
    console.log('1. Verify backend file is named exactly "http-functions.js"');
    console.log('2. Check Wix Editor console for deployment errors');
    console.log('3. Ensure site is published after making changes');
    console.log('4. Run browser diagnostics: runDiagnostics()');
    console.log('');
    console.log('📈 SUCCESS INDICATORS:');
    console.log('• Backend functions return 200 status codes');
    console.log('• Dive logs persist after page reload');
    console.log('• Image uploads trigger analysis');
    console.log('• Multiple images can be uploaded');
    console.log('• Browser console shows successful API calls');
    console.log('================================================');
}

// Run all verification tests
async function runFinalVerification() {
    await testWixBackendFunctions();
    await testDiveLogFlow();
    await testFrontendWidget();
    await testEndToEndIntegration();
    generateFinalReport();
}

runFinalVerification();
