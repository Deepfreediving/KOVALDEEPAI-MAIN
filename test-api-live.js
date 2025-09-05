const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testDiveImageUpload() {
    console.log('🧪 Testing Dive Computer Image Upload API...');
    console.log('===========================================\n');
    
    // Create a simple test image data (base64)
    const testImageBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
    
    try {
        console.log('📝 Test 1: Base64 Upload Test');
        console.log('============================');
        
        const base64Response = await fetch('http://localhost:3002/api/dive/upload-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageData: `data:image/png;base64,${testImageBase64}`,
                userId: '123e4567-e89b-12d3-a456-426614174000',
                diveLogId: '123e4567-e89b-12d3-a456-426614174001',
                filename: 'test-dive-computer.png'
            })
        });
        
        console.log('Status:', base64Response.status);
        console.log('Status Text:', base64Response.statusText);
        
        const base64Data = await base64Response.json();
        
        if (base64Response.ok) {
            console.log('✅ Base64 upload successful!');
            console.log('📊 Response summary:');
            console.log('   - Image ID:', base64Data.data?.imageId);
            console.log('   - Confidence:', base64Data.data?.confidence);
            console.log('   - Tokens used:', base64Data.data?.tokensUsed);
            console.log('   - Processing method:', base64Data.data?.processingMethod);
            
            if (base64Data.data?.extractedData) {
                console.log('   - Extracted depth:', base64Data.data.extractedData.maxDepth);
                console.log('   - Extracted time:', base64Data.data.extractedData.diveTime);
            }
            
            if (base64Data.data?.coachingInsights) {
                console.log('   - Performance rating:', base64Data.data.coachingInsights.performanceRating);
            }
        } else {
            console.log('❌ Base64 upload failed');
            console.log('Error:', JSON.stringify(base64Data, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error('Stack:', error.stack);
    }
    
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log('The API is working if you see "Base64 upload successful!" above.');
    console.log('Even with a simple test image, the vision analysis should provide structured output.');
}

// Run the test
testDiveImageUpload().catch(console.error);
