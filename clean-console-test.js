// CLEAN BROWSER CONSOLE TEST - No special characters
// Copy this EXACT code into your browser console on the live site

console.log('Testing DiveLogs collection field mapping fix...');

// Test data with correct field names for your Wix collection
var testData = {
    "User ID": 'field-test-' + Date.now(),
    "Dive Log ID": 'log-test-' + Date.now(), 
    "Log Entry": 'FIELD MAPPING TEST - This should save to DiveLogs collection!',
    "Dive Date": new Date().toISOString().split('T')[0],
    "Dive Time": '2:30'
};

console.log('Test data prepared:', testData);

// Test if Wix data API is available and working
if (typeof wixData !== 'undefined' && wixData.save) {
    console.log('Wix data API found - testing direct save...');
    
    wixData.save('DiveLogs', testData)
        .then(function(result) {
            console.log('SUCCESS! Field mapping fix worked:', result._id);
            console.log('Check your Wix Editor > Database > DiveLogs collection');
            console.log('Look for entry with "FIELD MAPPING TEST" in Log Entry');
        })
        .catch(function(error) {
            console.error('Save failed:', error);
            console.log('Field mapping still needs work...');
        });
} else {
    console.log('Wix data API not available');
    console.log('Widget may not be fully loaded - try refreshing page');
}

console.log('Test complete - check console output above for results');
