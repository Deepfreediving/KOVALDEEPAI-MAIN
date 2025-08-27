#!/usr/bin/env node

// Test image upload API to debug RLS issues
const fetch = require('node-fetch');

async function testImageUpload() {
  console.log('🧪 Testing image upload API to debug RLS issues...');
  
  // Create a simple test base64 image (1x1 red pixel PNG)
  const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==';
  
  try {
    const response = await fetch('https://koval-deep-ai-main.vercel.app/api/openai/upload-dive-image-base64', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: testImage,
        userId: '11111111-1111-1111-1111-111111111111',
        filename: 'test-image.png'
      })
    });
    
    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('✅ Image upload API returned success');
      if (data.imageId) {
        console.log('✅ Image ID returned:', data.imageId);
      } else {
        console.log('⚠️ No image ID returned - database insert likely failed');
      }
    } else {
      console.log('❌ Image upload failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testImageUpload();
