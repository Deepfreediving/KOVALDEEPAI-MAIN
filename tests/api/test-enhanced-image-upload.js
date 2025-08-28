const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');
const path = require('path');

async function testImageUpload() {
  console.log('🧪 Testing enhanced image upload with OCR + AI Vision...\n');

  // Use Daniel's actual dive computer image
  const imagePath = path.join(process.cwd(), 'public', 'freedive log', '061921 Vb training first dive to 100m cwt.JPG');
  
  try {
    if (!fs.existsSync(imagePath)) {
      console.log('❌ Test image not found at:', imagePath);
      return;
    }

    console.log(`📸 Testing with image: 061921 Vb training first dive to 100m cwt.JPG`);
    console.log(`📁 Full path: ${imagePath}`);

    // Create form data
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    formData.append('diveLogId', 'test-dive-log-' + Date.now());

    console.log('🚀 Uploading to enhanced API...');

    const response = await fetch('http://localhost:3000/api/openai/upload-dive-image-simple', {
      method: 'POST',
      body: formData,
    });

    console.log(`📡 Response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ Upload successful!');
      console.log('📊 Result:', JSON.stringify(result, null, 2));
      
      if (result.data.ocrText) {
        console.log('\n🔍 OCR Text extracted:');
        console.log(result.data.ocrText.substring(0, 300) + '...');
      }
      
      if (result.data.extractedMetrics && Object.keys(result.data.extractedMetrics).length > 0) {
        console.log('\n📈 Metrics extracted:');
        console.log(JSON.stringify(result.data.extractedMetrics, null, 2));
      }
    } else {
      const error = await response.text();
      console.error('❌ Upload failed:', error);
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testImageUpload();
