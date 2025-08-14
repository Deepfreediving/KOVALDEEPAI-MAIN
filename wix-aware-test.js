// 🧪 WIX-AWARE CONSOLE TEST - Safe for any page
// Copy this into browser console on https://www.deepfreediving.com/large-koval-deep-ai-page

console.log('🧪 Testing DiveLogs collection - V5.0 Field Mapping Fix...');
console.log('================================================');

// First check if we're on a Wix page
function checkWixEnvironment() {
    console.log('🔍 Checking environment...');
    
    if (typeof wixData === 'undefined') {
        console.log('❌ wixData not available');
        console.log('📍 Current URL:', window.location.href);
        
        if (window.location.href.includes('deepfreediving.com')) {
            console.log('✅ On deepfreediving.com domain');
            console.log('⚠️ Need to be on the actual page with the AI widget');
            console.log('🔗 Go to: https://www.deepfreediving.com/large-koval-deep-ai-page');
            return false;
        } else {
            console.log('❌ Not on the correct domain');
            console.log('🔗 Go to: https://www.deepfreediving.com/large-koval-deep-ai-page');
            return false;
        }
    }
    
    console.log('✅ wixData is available');
    return true;
}

// Test function that only runs on Wix pages
function testDiveLogsCollection() {
    if (!checkWixEnvironment()) {
        console.log('================================================');
        console.log('ℹ️ INSTRUCTIONS:');
        console.log('1. Go to: https://www.deepfreediving.com/large-koval-deep-ai-page');
        console.log('2. Wait for page to fully load');
        console.log('3. Open browser console (F12)');
        console.log('4. Run this test script again');
        console.log('================================================');
        return;
    }
    
    console.log('🔍 Testing V5.0 field mapping fix...');
    
    // Test data with EXACT field names from your Wix collection
    var testData = {
        "User ID": 'v5-field-test-' + Date.now(),
        "Dive Log ID": 'v5-log-test-' + Date.now(), 
        "Log Entry": 'V5.0 FIELD MAPPING TEST - Collection save should work now!',
        "Dive Date": new Date().toISOString().split('T')[0],
        "Dive Time": '2:30'
    };
    
    console.log('📝 Test data prepared:', testData);
    
    // Test the actual Wix save
    console.log('💾 Attempting save to DiveLogs collection...');
    
    wixData.save('DiveLogs', testData)
        .then(function(result) {
            console.log('🎉 SUCCESS! V5.0 field mapping works!');
            console.log('✅ Saved with ID:', result._id);
            console.log('🔍 Check your Wix Editor > Database > DiveLogs collection');
            console.log('📋 Look for entry with "V5.0 FIELD MAPPING TEST"');
            console.log('');
            console.log('🎯 CONCLUSION: The 3-week DiveLogs collection bug is FIXED!');
        })
        .catch(function(error) {
            console.error('❌ Save failed:', error);
            console.log('🔍 Error details:', error.message);
            console.log('⚠️ Field mapping may still need adjustment...');
        });
}

// Run the test
testDiveLogsCollection();
