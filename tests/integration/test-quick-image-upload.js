#!/usr/bin/env node
// Quick test to verify dive computer image processing pipeline

const fs = require('fs');
const path = require('path');

async function testImageUpload() {
  console.log('🧪 QUICK IMAGE UPLOAD TEST');
  console.log('========================');
  
  const PRODUCTION_URL = 'https://kovaldeepai-main.vercel.app';
  const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  
  // Find a test dive image
  const diveImagePath = path.join(__dirname, '../../public/freedive log/061921 Vb training first dive to 100m cwt.JPG');
  
  if (!fs.existsSync(diveImagePath)) {
    console.error('❌ Test image not found at:', diveImagePath);
    return;
  }
  
  console.log('📸 Using test image: 061921 Vb training first dive to 100m cwt.JPG');
  
  try {
    // Convert to base64 for the simple endpoint
    const imageBuffer = fs.readFileSync(diveImagePath);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    
    console.log(`📊 Image size: ${Math.round(imageBuffer.length / 1024)}KB`);
    console.log('📤 Uploading via /api/openai/upload-dive-image-simple...');
    
    const response = await fetch(`${PRODUCTION_URL}/api/openai/upload-dive-image-simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': ADMIN_USER_ID
      },
      body: JSON.stringify({
        imageData: base64Image,
        userId: ADMIN_USER_ID
      })
    });
    
    console.log(`📥 Response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      
      console.log('✅ IMAGE UPLOAD SUCCESSFUL!');
      console.log('📊 Results:');
      console.log(`   🤖 Has Analysis: ${!!result.data?.extractedText}`);
      console.log(`   📈 Has Metrics: ${!!result.data?.extractedMetrics}`);
      console.log(`   🆔 Image ID: ${result.data?.imageId || 'None'}`);
      console.log(`   🔗 Image URL: ${result.data?.imageUrl ? 'Generated' : 'Not generated'}`);
      
      if (result.data?.extractedMetrics) {
        console.log('   📊 Extracted Metrics:');
        Object.entries(result.data.extractedMetrics).forEach(([key, value]) => {
          console.log(`      • ${key}: ${value}`);
        });
      }
      
      console.log('\n🎉 DIVE COMPUTER IMAGE PROCESSING PIPELINE IS WORKING!');
      
    } else {
      const errorText = await response.text();
      console.error('❌ Upload failed:', response.status);
      console.error('Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testImageUpload();
