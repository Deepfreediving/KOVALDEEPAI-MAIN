// DIVE LOGS COLLECTION FIX TEST
// Run this to test if the corrected API endpoints work

console.log('🔧 Testing corrected dive logs save functionality...');

async function testCorrectedSave() {
    const testDiveLog = {
        userId: 'fix-test-' + Date.now(),
        date: '2024-12-20',
        discipline: 'Emergency Fix Test',
        disciplineType: 'depth',
        location: 'Fix Test Pool',
        targetDepth: 15,
        reachedDepth: 12,
        notes: 'Testing the corrected API endpoints to fix 3-week save issue',
        totalDiveTime: '1:30',
        surfaceProtocol: 'OK'
    };

    console.log('📝 Test dive log:', testDiveLog);

    try {
        console.log('🚀 Calling corrected save-dive-log endpoint...');
        
        const response = await fetch('/api/analyze/save-dive-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testDiveLog)
        });

        const result = await response.json();
        
        console.log('📥 Response status:', response.status);
        console.log('📊 Response data:', result);

        if (result.success) {
            console.log('✅ Save endpoint returned success!');
            
            // Wait a moment for background sync
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Try to retrieve the saved log
            console.log('🔍 Checking if log was actually saved...');
            
            const checkResponse = await fetch(`/api/analyze/get-dive-logs?userId=${testDiveLog.userId}`);
            const checkResult = await checkResponse.json();
            
            console.log('📋 Retrieved logs:', checkResult);
            
            if (checkResult.logs && checkResult.logs.length > 0) {
                console.log('🎉 SUCCESS! Dive log was actually saved to collection!');
                console.log('📊 Saved log details:', checkResult.logs[0]);
            } else {
                console.log('❌ Log was not found in collection - still an issue');
            }
        } else {
            console.error('❌ Save endpoint failed:', result);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Also test direct save-wix-data endpoint
async function testDirectWixSave() {
    console.log('\n🎯 Testing direct Wix save endpoint...');
    
    const testData = {
        userId: 'direct-wix-test-' + Date.now(),
        diveLogId: 'test-direct-' + Date.now(),
        logEntry: JSON.stringify({
            location: 'Direct Test',
            depth: 8,
            notes: 'Testing direct Wix save'
        }),
        diveDate: new Date().toISOString().split('T')[0],
        diveTime: new Date().toISOString()
    };

    try {
        const response = await fetch('/api/wix/save-wix-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                collectionId: 'DiveLogs',
                item: testData
            })
        });

        const result = await response.json();
        
        console.log('📥 Direct save response:', response.status);
        console.log('📊 Direct save result:', result);

        if (response.ok && result.data) {
            console.log('✅ Direct Wix save WORKS!');
            console.log('💾 Saved item ID:', result.data._id);
        } else {
            console.error('❌ Direct Wix save failed');
        }

    } catch (error) {
        console.error('❌ Direct save test failed:', error);
    }
}

// Run both tests
console.log('Starting corrected save tests...');
testCorrectedSave();
setTimeout(testDirectWixSave, 5000); // Run after 5 seconds

console.log('\n📋 If these tests pass, the 3-week issue should be FIXED!');
console.log('🎯 The problem was using query-wix-data for INSERT instead of save-wix-data');
console.log('🔧 Now using the correct API endpoints for saving to DiveLogs collection');
