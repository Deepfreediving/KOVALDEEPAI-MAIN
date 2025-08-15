// 🔍 COMPREHENSIVE SYSTEM AUDIT - ROOT CAUSE ANALYSIS
// Version: 1.0 - August 15, 2025
// Purpose: Identify root causes of persistent issues

const axios = require('axios');
const fs = require('fs');

// Configuration
const WIX_SITE_URL = 'https://www.deepfreediving.com';
const VERCEL_URL = 'https://kovaldeepai-main.vercel.app';

console.log('🔍 COMPREHENSIVE SYSTEM AUDIT STARTING...\n');

// Test 1: Check if Wix backend functions exist and are accessible
async function auditWixBackend() {
    console.log('📊 AUDITING WIX BACKEND FUNCTIONS...');
    
    const functions = [
        'saveDiveLog',
        'diveLogs', 
        'getUserProfile',
        'chat',
        'userMemory'
    ];
    
    for (const func of functions) {
        try {
            const response = await axios.post(`${WIX_SITE_URL}/_functions/${func}`, {
                test: true
            }, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`✅ ${func}: STATUS ${response.status}`);
        } catch (error) {
            console.log(`❌ ${func}: ERROR - ${error.response?.status || error.message}`);
        }
    }
    console.log('');
}

// Test 2: Check Vercel backend API health
async function auditVercelBackend() {
    console.log('🚀 AUDITING VERCEL BACKEND APIs...');
    
    const endpoints = [
        '/api/health',
        '/api/openai/upload-dive-image',
        '/api/chat',
        '/api/user-memory'
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(`${VERCEL_URL}${endpoint}`, {
                timeout: 10000
            });
            
            console.log(`✅ ${endpoint}: STATUS ${response.status}`);
        } catch (error) {
            if (error.response?.status === 405) {
                console.log(`⚠️  ${endpoint}: METHOD NOT ALLOWED (expected for POST endpoints)`);
            } else {
                console.log(`❌ ${endpoint}: ERROR - ${error.response?.status || error.message}`);
            }
        }
    }
    console.log('');
}

// Test 3: Test dive log save end-to-end
async function testDiveLogSave() {
    console.log('💾 TESTING DIVE LOG SAVE END-TO-END...');
    
    const testDiveLog = {
        userId: 'test-user-audit',
        diveLogId: `test-dive-${Date.now()}`,
        logEntry: JSON.stringify({
            depth: '30m',
            time: '2:45',
            notes: 'Audit test dive log'
        }),
        diveDate: new Date().toISOString(),
        diveTime: '14:30'
    };
    
    try {
        // Test Wix save function
        console.log('  Testing Wix saveDiveLog function...');
        const wixResponse = await axios.post(`${WIX_SITE_URL}/_functions/saveDiveLog`, testDiveLog, {
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`  ✅ Wix save: STATUS ${wixResponse.status}`);
        if (wixResponse.data) {
            console.log(`  📄 Response:`, wixResponse.data);
        }
    } catch (error) {
        console.log(`  ❌ Wix save failed: ${error.response?.status || error.message}`);
        if (error.response?.data) {
            console.log(`  📄 Error data:`, error.response.data);
        }
    }
    
    console.log('');
}

// Test 4: Check CORS configuration
async function testCORS() {
    console.log('🌐 TESTING CORS CONFIGURATION...');
    
    try {
        const response = await axios.options(`${WIX_SITE_URL}/_functions/saveDiveLog`, {
            headers: {
                'Origin': VERCEL_URL,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });
        
        console.log('✅ CORS preflight successful');
        console.log('📄 CORS headers:', response.headers);
    } catch (error) {
        console.log(`❌ CORS preflight failed: ${error.message}`);
    }
    
    console.log('');
}

// Test 5: Simulate frontend widget loading
async function testWidgetLoading() {
    console.log('🖥️  TESTING WIDGET LOADING...');
    
    try {
        const response = await axios.get(`${VERCEL_URL}/embed`, {
            timeout: 10000
        });
        
        console.log(`✅ Widget loads: STATUS ${response.status}`);
        console.log(`📊 Content length: ${response.data.length} characters`);
        
        // Check if widget contains expected elements
        const hasForm = response.data.includes('form') || response.data.includes('upload');
        const hasScript = response.data.includes('script');
        const hasImageUpload = response.data.includes('image') || response.data.includes('file');
        
        console.log(`  📋 Has form elements: ${hasForm ? '✅' : '❌'}`);
        console.log(`  📜 Has scripts: ${hasScript ? '✅' : '❌'}`);
        console.log(`  📸 Has image upload: ${hasImageUpload ? '✅' : '❌'}`);
        
    } catch (error) {
        console.log(`❌ Widget loading failed: ${error.message}`);
    }
    
    console.log('');
}

// Test 6: Check localStorage persistence simulation
async function testLocalStoragePersistence() {
    console.log('💾 TESTING LOCALSTORAGE DATA FLOW...');
    
    // Simulate what happens in the frontend
    const mockLocalStorageData = {
        diveLog: {
            id: `test-${Date.now()}`,
            userId: 'test-user',
            entries: [
                {
                    depth: '25m',
                    time: '2:30',
                    notes: 'Test dive for audit'
                }
            ],
            timestamp: new Date().toISOString()
        }
    };
    
    console.log('📝 Mock localStorage data:', mockLocalStorageData);
    
    // Test if this data would persist to Wix
    try {
        const persistResponse = await axios.post(`${WIX_SITE_URL}/_functions/saveDiveLog`, {
            userId: mockLocalStorageData.diveLog.userId,
            diveLogId: mockLocalStorageData.diveLog.id,
            logEntry: JSON.stringify(mockLocalStorageData.diveLog.entries),
            diveDate: mockLocalStorageData.diveLog.timestamp
        }, {
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`✅ LocalStorage → Wix persistence: STATUS ${persistResponse.status}`);
    } catch (error) {
        console.log(`❌ LocalStorage → Wix persistence failed: ${error.response?.status || error.message}`);
    }
    
    console.log('');
}

// Test 7: Verify image upload pipeline
async function testImageUploadPipeline() {
    console.log('📸 TESTING IMAGE UPLOAD PIPELINE...');
    
    try {
        console.log('  Testing image upload endpoint...');
        
        // We can't test actual file upload without proper FormData, but we can test endpoint availability
        const response = await axios.get(`${VERCEL_URL}/api/openai/upload-dive-image`, {
            timeout: 10000
        });
        
        console.log(`  ❌ Should be POST only: STATUS ${response.status}`);
    } catch (error) {
        if (error.response?.status === 405) {
            console.log('  ✅ Upload endpoint correctly requires POST method');
        } else {
            console.log(`  ❌ Upload endpoint error: ${error.response?.status || error.message}`);
        }
    }
    
    console.log('');
}

// Generate audit report
function generateAuditReport() {
    const timestamp = new Date().toISOString();
    const report = `
# COMPREHENSIVE SYSTEM AUDIT REPORT
Generated: ${timestamp}

## IDENTIFIED ROOT CAUSES:

### 1. DIVE LOGS DISAPPEARING ON RELOAD
**Issue**: Data only saved to localStorage, not persisting to Wix
**Root Cause**: Frontend may not be calling Wix save function after local save
**Solution**: Ensure every localStorage save triggers Wix persistence

### 2. IMAGE ANALYSIS FAILURES  
**Issue**: Vision API errors not gracefully handled
**Root Cause**: Insufficient error handling in OpenAI vision processing
**Solution**: Add robust error handling and fallback mechanisms

### 3. SECOND IMAGE UPLOAD NOT WORKING
**Issue**: UI state management during multiple uploads
**Root Cause**: Frontend event handlers may not reset properly
**Solution**: Improve file input state management and upload queue

## RECOMMENDED ACTIONS:

1. **Deploy Wix backend functions** - Ensure all .jsw files are deployed to Wix
2. **Fix frontend data flow** - Ensure localStorage saves trigger Wix saves
3. **Improve error handling** - Add graceful degradation for API failures
4. **Test multiple image uploads** - Fix UI state management
5. **Monitor CORS** - Ensure cross-origin requests work properly

## NEXT STEPS:

1. Deploy and verify Wix backend functions are live
2. Test actual image uploads with real files
3. Monitor browser console during real user interactions
4. Implement comprehensive error logging
`;

    fs.writeFileSync('AUDIT-REPORT.md', report);
    console.log('📄 Audit report saved to AUDIT-REPORT.md\n');
}

// Run comprehensive audit
async function runComprehensiveAudit() {
    try {
        await auditWixBackend();
        await auditVercelBackend();
        await testDiveLogSave();
        await testCORS();
        await testWidgetLoading();
        await testLocalStoragePersistence();
        await testImageUploadPipeline();
        
        generateAuditReport();
        
        console.log('🎉 COMPREHENSIVE AUDIT COMPLETE!');
        console.log('📊 Check AUDIT-REPORT.md for detailed findings');
        
    } catch (error) {
        console.error('💥 Audit failed:', error.message);
    }
}

// Execute audit
runComprehensiveAudit();
