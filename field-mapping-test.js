// 🧪 FIELD MAPPING TEST - Copy and paste into browser console
// This tests the exact field names that your Wix collection expects

console.log('🔧 TESTING FIELD MAPPING FIX FOR DIVELOGS COLLECTION...');
console.log('================================================');

function testFieldMappingFix() {
    console.log('🔍 Testing with correct Wix field names...');
    
    // Create test data with EXACT field names from your Wix collection
    const testLogWithCorrectFields = {
        "User ID": 'field-test-' + Date.now(),
        "Dive Log ID": 'log-field-test-' + Date.now(),
        "Log Entry": JSON.stringify({
            discipline: 'FIELD MAPPING TEST',
            location: 'Console Test Pool',
            targetDepth: 10,
            reachedDepth: 10,
            notes: 'Testing if field name mapping is now correct!'
        }),
        "Dive Date": new Date().toISOString().split('T')[0],
        "Dive Time": '2:30'
    };
    
    console.log('📝 Test data with correct field names:', testLogWithCorrectFields);
    
    // Test if the updated save function exists and works
    if (typeof tryWixCollectionSave === 'function') {
        console.log('✅ tryWixCollectionSave function found - testing...');
        
        tryWixCollectionSave(testLogWithCorrectFields)
            .then(result => {
                console.log('🎉 SUCCESS! Field mapping test passed:', result);
                console.log('✅ Your DiveLogs collection should now have a new entry!');
                console.log('🔍 Check Wix Editor > Database > DiveLogs for the new entry');
            })
            .catch(error => {
                console.error('❌ Field mapping test failed:', error);
                console.log('🔧 Still debugging field name issues...');
            });
    } else {
        console.error('❌ tryWixCollectionSave function not found');
        console.log('⚠️ Widget may not be fully loaded - try refreshing page');
    }
}

// Check if Wix data API is available
if (typeof wixData !== 'undefined' && wixData.save) {
    console.log('✅ Wix data API is available');
    console.log('📋 Testing direct Wix save with correct field names...');
    
    const directTestData = {
        "User ID": 'direct-field-test-' + Date.now(),
        "Dive Log ID": 'direct-log-test-' + Date.now(),
        "Log Entry": 'DIRECT FIELD TEST - This should appear in your collection!',
        "Dive Date": new Date().toISOString().split('T')[0],
        "Dive Time": '1:45'
    };
    
    wixData.save('DiveLogs', directTestData)
        .then(result => {
            console.log('🎉 DIRECT SAVE SUCCESS! Field mapping is working:', result._id);
            console.log('✅ The 3-week collection bug should now be FIXED!');
        })
        .catch(error => {
            console.error('❌ Direct save failed:', error);
            console.log('🔍 Field mapping might still need adjustment...');
        });
} else {
    console.log('⚠️ Wix data API not available - using widget save function');
    testFieldMappingFix();
}

console.log('================================================');
console.log('📋 NEXT STEPS:');
console.log('1. Check console output above for success/error messages');
console.log('2. Go to Wix Editor > Database > DiveLogs collection');
console.log('3. Look for new test entries with "FIELD" in the name');
console.log('4. If successful, try saving a real dive log through the AI widget');
console.log('================================================');
