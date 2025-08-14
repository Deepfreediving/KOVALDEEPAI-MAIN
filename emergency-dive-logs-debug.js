// EMERGENCY DIVE LOGS COLLECTION DEBUG SCRIPT
// This will help us figure out why NO dive logs are being saved to DiveLogs collection

console.log('🚨 EMERGENCY DIVE LOGS COLLECTION DEBUG STARTING...');
console.log('='.repeat(60));

// Test 1: Check if we can access Wix Data API at all
async function testWixDataAccess() {
    console.log('🔍 TEST 1: Testing Wix Data API Access...');
    
    try {
        // Try to query ANY collection to see if wixData works
        const response = await fetch('/api/wix/query-wix-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                collectionId: 'DiveLogs',
                limit: 5
            })
        });
        
        const result = await response.json();
        console.log('📊 Wix Data Query Result:', result);
        
        if (result.success) {
            console.log('✅ Wix Data API is accessible');
            console.log(`📋 Found ${result.items?.length || 0} existing dive logs`);
        } else {
            console.error('❌ Wix Data API query failed:', result);
        }
        
        return result;
    } catch (error) {
        console.error('❌ Wix Data API test failed:', error);
        return { success: false, error: error.message };
    }
}

// Test 2: Try to save a simple test dive log
async function testDiveLogSave() {
    console.log('\n💾 TEST 2: Testing Dive Log Save...');
    
    const testLog = {
        userId: 'test-emergency-' + Date.now(),
        date: '2024-12-20',
        discipline: 'Test Emergency Save',
        location: 'Debug Pool',
        targetDepth: 10,
        reachedDepth: 10,
        notes: 'Emergency test to debug collection saves',
        timestamp: new Date().toISOString()
    };
    
    console.log('📝 Test log data:', testLog);
    
    try {
        // Try the main save endpoint
        const response = await fetch('/api/analyze/save-dive-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testLog)
        });
        
        const result = await response.json();
        console.log('📥 Save API Response:', result);
        
        if (result.success) {
            console.log('✅ Save API returned success');
            
            // Now try to retrieve it
            const checkResponse = await fetch(`/api/analyze/get-dive-logs?userId=${testLog.userId}`);
            const checkResult = await checkResponse.json();
            console.log('🔍 Retrieval check:', checkResult);
        } else {
            console.error('❌ Save API failed:', result);
        }
        
        return result;
    } catch (error) {
        console.error('❌ Save test failed:', error);
        return { success: false, error: error.message };
    }
}

// Test 3: Check Wix collection permissions and structure
async function checkWixCollectionSetup() {
    console.log('\n🏗️ TEST 3: Checking Wix Collection Setup...');
    
    // Try different collection names that might exist
    const possibleCollections = [
        'DiveLogs',
        'Dive Logs', 
        'diveLogs',
        'UserMemory',
        'PrivateMembersData'
    ];
    
    for (const collectionName of possibleCollections) {
        try {
            console.log(`🔍 Checking collection: ${collectionName}`);
            
            const response = await fetch('/api/wix/query-wix-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collectionId: collectionName,
                    limit: 1
                })
            });
            
            const result = await response.json();
            
            if (result.success && !result.error) {
                console.log(`✅ ${collectionName}: Accessible, ${result.items?.length || 0} items`);
            } else {
                console.log(`❌ ${collectionName}: ${result.error || 'Not accessible'}`);
            }
        } catch (error) {
            console.log(`❌ ${collectionName}: Error - ${error.message}`);
        }
    }
}

// Test 4: Check environment variables and API keys
function checkEnvironmentSetup() {
    console.log('\n🔧 TEST 4: Environment Setup Check...');
    
    // These will show as undefined in browser, but good for diagnosis
    console.log('Environment check (will show undefined in browser):');
    console.log('- WIX_API_KEY:', typeof process !== 'undefined' ? '***' + (process.env?.WIX_API_KEY?.slice(-4) || 'undefined') : 'browser-context');
    console.log('- BASE_URL:', typeof process !== 'undefined' ? process.env?.BASE_URL || 'undefined' : window.location.origin);
    console.log('- VERCEL_URL:', typeof process !== 'undefined' ? process.env?.VERCEL_URL || 'undefined' : 'browser-context');
}

// Test 5: Try direct Wix backend function call
async function testWixBackendDirect() {
    console.log('\n🎯 TEST 5: Testing Direct Wix Backend Call...');
    
    const testData = {
        action: 'insert',
        collection: 'DiveLogs',
        data: {
            userId: 'direct-test-' + Date.now(),
            diveLogId: 'direct-test-log-' + Date.now(),
            logEntry: JSON.stringify({
                location: 'Direct Test',
                depth: 5,
                notes: 'Direct backend test'
            }),
            diveDate: new Date().toISOString(),
            diveTime: new Date().toISOString()
        }
    };
    
    try {
        console.log('📤 Calling Wix backend directly...');
        
        const response = await fetch('https://www.deepfreediving.com/_functions/dive-journal-repeater', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer dev-mode'
            },
            body: JSON.stringify(testData)
        });
        
        const result = await response.text(); // Get as text first
        console.log('📥 Raw response:', result);
        
        try {
            const jsonResult = JSON.parse(result);
            console.log('📊 Parsed result:', jsonResult);
        } catch (parseError) {
            console.log('⚠️ Response is not JSON, raw text above');
        }
        
    } catch (error) {
        console.error('❌ Direct backend test failed:', error);
    }
}

// Run all tests
async function runEmergencyDiagnostics() {
    console.log('🚨 Starting emergency diagnostics for DiveLogs collection...');
    
    await testWixDataAccess();
    await testDiveLogSave();
    await checkWixCollectionSetup();
    checkEnvironmentSetup();
    await testWixBackendDirect();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 DIAGNOSIS COMPLETE');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Check the results above for errors');
    console.log('2. If all APIs fail, check Wix collection exists and has correct permissions');
    console.log('3. If collection exists but saves fail, check field structure');
    console.log('4. If backend calls fail, check Wix function deployment');
    console.log('');
    console.log('💡 LIKELY ISSUES:');
    console.log('- DiveLogs collection does not exist in Wix');
    console.log('- Collection permissions are too restrictive'); 
    console.log('- Field names do not match what the code expects');
    console.log('- Wix backend functions are not deployed');
    console.log('- API keys are missing or incorrect');
}

// Auto-run the diagnostics
runEmergencyDiagnostics();
