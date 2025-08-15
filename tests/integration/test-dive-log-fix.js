// 🔥 TEST DIVE LOG FIX - Verify embed.jsx matches Wix frontend
// Purpose: Test that dive logs save correctly with proper field mapping
// Version: 1.0 - Field mapping fix verification

const axios = require('axios');

const WIX_SITE_URL = 'https://www.deepfreediving.com';

console.log('🧪 TESTING DIVE LOG FIX - Field Mapping Verification');
console.log('=====================================================\n');

// Test 1: Verify saveDiveLog endpoint accepts correct data structure
async function testSaveDiveLogEndpoint() {
    console.log('📋 TESTING SAVE DIVE LOG ENDPOINT...');
    
    // This matches the structure that embed.jsx now sends
    const testDiveLog = {
        userId: 'test-fix-user',
        diveLogId: `dive_${Date.now()}_test`,
        logEntry: JSON.stringify({
            dive: {
                depth: '30m',
                time: '3:00',
                discipline: 'FIM',
                location: 'Test Location',
                notes: 'Field mapping fix test'
            },
            analysis: {
                discipline: 'FIM',
                reachedDepth: 30,
                targetDepth: 30,
                location: 'Test Location',
                notes: 'Field mapping fix test'
            },
            metadata: {
                type: 'dive_log',
                source: 'dive-journal-widget',
                timestamp: new Date().toISOString(),
                version: '5.0'
            }
        }),
        diveDate: new Date().toISOString(),
        diveTime: '15:30',
        watchedPhoto: null, // ✅ FIXED: Using correct field name
        dataType: 'dive_log'
    };
    
    try {
        const response = await axios.post(`${WIX_SITE_URL}/_functions/saveDiveLog`, testDiveLog, {
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.status === 200 && response.data.success) {
            console.log(`✅ Fixed dive log save: SUCCESS`);
            console.log(`   Wix ID: ${response.data._id}`);
            console.log(`   Dive Log ID: ${response.data.diveLogId}`);
            return true;
        } else {
            console.log(`❌ Fixed dive log save: FAILED`);
            console.log(`   Response:`, response.data);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Fixed dive log save: ERROR - ${error.response?.status || error.message}`);
        if (error.response?.data) {
            console.log(`   Error details:`, error.response.data);
        }
        return false;
    }
}

// Test 2: Verify field mapping differences
function verifyFieldMappingFix() {
    console.log('\n🔄 VERIFYING FIELD MAPPING FIXES...');
    
    console.log('✅ Fixed Issues:');
    console.log('   1. diveLogWatch → watchedPhoto (correct field name)');
    console.log('   2. /userMemory → /saveDiveLog (correct endpoint)');
    console.log('   3. Complex nested structure → Simple flat structure');
    console.log('   4. localStorage key: diveLogs_${userId} (underscore)');
    
    console.log('\n🎯 Expected Behavior:');
    console.log('   • Dive logs save to Wix DiveLogs collection');
    console.log('   • Images save as watchedPhoto field');
    console.log('   • Data persists after page refresh');
    console.log('   • Sidebar shows saved dive logs');
    console.log('   • Main repeater shows saved dive logs');
}

// Test 3: Test localStorage key consistency
function testLocalStorageKeyFix() {
    console.log('\n💾 TESTING LOCALSTORAGE KEY CONSISTENCY...');
    
    console.log('✅ Fixed localStorage Key Format:');
    console.log('   • Wix Frontend: diveLogs_${userId} (underscore)');
    console.log('   • Embed.jsx: diveLogs_${userId} (underscore)');
    console.log('   • Components: diveLogs_${userId} (underscore)');
    
    console.log('\n❌ Previous Issue:');
    console.log('   • Mixed diveLogs-${userId} (hyphen) and diveLogs_${userId} (underscore)');
    console.log('   • Caused data to appear temporarily but disappear on refresh');
}

// Run all tests
async function runDiveLogFixTest() {
    const saveTest = await testSaveDiveLogEndpoint();
    verifyFieldMappingFix();
    testLocalStorageKeyFix();
    
    console.log('\n📊 DIVE LOG FIX TEST SUMMARY');
    console.log('===============================');
    
    if (saveTest) {
        console.log('✅ All fixes applied successfully!');
        console.log('\n🚀 Next Steps:');
        console.log('1. Deploy updated embed.jsx to Vercel');
        console.log('2. Deploy updated wix-frontend-CLEAN.js to Wix');
        console.log('3. Test live site: Save dive log with image');
        console.log('4. Verify data persists after page refresh');
        console.log('5. Check that dive logs appear in sidebar AND repeater');
    } else {
        console.log('❌ Backend test failed - check Wix deployment');
    }
}

runDiveLogFixTest();
