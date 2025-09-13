#!/usr/bin/env node

/**
 * Test the upload endpoint to verify Vision API extracts real data
 */

const fs = require('fs');
const path = require('path');
const { FormData } = require('undici');

async function testUploadEndpoint() {
  console.log('🧪 Testing Upload Endpoint Vision API Fix\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test with a real dive computer image
    const testImagePath = path.join(__dirname, 'public', 'freedive log', '110m pb phillipines 060719.JPG');
    
    if (!fs.existsSync(testImagePath)) {
      throw new Error(`Test image not found: ${testImagePath}`);
    }
    
    console.log('📸 Using test image:', path.basename(testImagePath));
    
    // Create form data
    const formData = new FormData();
    const imageBuffer = fs.readFileSync(testImagePath);
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('image', imageBlob, '110m_pb_test.jpg');
    formData.append('userId', '550e8400-e29b-41d4-a716-446655440000');
    
    console.log('📤 Uploading to /api/dive/upload-image...');
    
    const uploadResponse = await fetch(`${baseUrl}/api/dive/upload-image`, {
      method: 'POST',
      body: formData,
      headers: {
        'x-user-id': '550e8400-e29b-41d4-a716-446655440000'
      }
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => 'No error details');
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }
    
    const result = await uploadResponse.json();
    console.log('✅ Upload successful!\n');
    
    console.log('📊 EXTRACTED METRICS:');
    const metrics = result.data?.extractedMetrics;
    if (metrics) {
      console.log('  - Max Depth:', metrics.max_depth || 'Not extracted');
      console.log('  - Dive Time:', metrics.dive_time_formatted || 'Not extracted');
      console.log('  - Temperature:', metrics.temperature || 'Not extracted');
      console.log('  - Date:', metrics.dive_date || 'Not extracted');
      console.log('  - Confidence:', metrics.confidence || 'Not available');
      
      // Check if real data was extracted
      const hasRealData = metrics.max_depth && metrics.max_depth > 0 && 
                         metrics.dive_time_formatted && metrics.dive_time_formatted !== 'N/A';
      
      if (hasRealData) {
        console.log('\n🎉 SUCCESS: Real dive computer data extracted!');
        console.log(`✅ Depth: ${metrics.max_depth}m (should be around 108-110m)`);
        console.log(`✅ Time: ${metrics.dive_time_formatted} (should be around 2:53)`);
      } else {
        console.log('\n❌ FAILED: Still getting N/A values instead of real data');
      }
    } else {
      console.log('❌ No extracted metrics found in response');
    }
    
    console.log('\n🔗 IMAGE STORAGE:');
    console.log('  - Image URL:', result.data?.imageUrl || 'Not stored');
    console.log('  - Image ID:', result.data?.imageId || 'Not generated');
    
    return result;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return null;
  }
}

// Run the test
if (require.main === module) {
  testUploadEndpoint().then(result => {
    process.exit(result ? 0 : 1);
  });
}

module.exports = { testUploadEndpoint };
