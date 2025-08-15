// 🔍 WIX BACKEND FUNCTION ERROR DIAGNOSIS
// Purpose: Identify specific errors in Wix backend functions

const axios = require('axios');

const WIX_SITE_URL = 'https://www.deepfreediving.com';

async function diagnoseSingleFunction(functionName) {
    console.log(`\n🔍 DIAGNOSING: ${functionName}`);
    
    try {
        const response = await axios.post(`${WIX_SITE_URL}/_functions/${functionName}`, {
            test: true,
            minimal: true
        }, {
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'KovalAI-Diagnostics/1.0'
            },
            validateStatus: function (status) {
                return status < 600; // Accept all status codes to see what we get
            }
        });
        
        console.log(`✅ STATUS: ${response.status}`);
        console.log(`📄 RESPONSE:`, response.data);
        console.log(`📋 HEADERS:`, response.headers);
        
    } catch (error) {
        console.log(`❌ ERROR:`, error.message);
        if (error.response) {
            console.log(`📊 STATUS: ${error.response.status}`);
            console.log(`📄 DATA:`, error.response.data);
            console.log(`📋 HEADERS:`, error.response.headers);
        }
    }
}

// Test each function individually
async function diagnoseAllFunctions() {
    console.log('🏥 WIX BACKEND FUNCTION HEALTH CHECK\n');
    
    const functions = [
        'saveDiveLog',
        'diveLogs', 
        'getUserProfile',
        'chat',
        'userMemory'
    ];
    
    for (const func of functions) {
        await diagnoseSingleFunction(func);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay between tests
    }
    
    // Also test with GET method
    console.log('\n🔄 TESTING GET METHODS...');
    for (const func of functions) {
        try {
            const response = await axios.get(`${WIX_SITE_URL}/_functions/${func}`, {
                timeout: 10000,
                validateStatus: function (status) {
                    return status < 600;
                }
            });
            console.log(`GET ${func}: STATUS ${response.status}`);
        } catch (error) {
            console.log(`GET ${func}: ERROR ${error.response?.status || error.message}`);
        }
    }
}

diagnoseAllFunctions();
