// Test image upload
const testImageUpload = async () => {
  console.log('Testing Image Upload...');
  
  const PRODUCTION_URL = 'https://kovaldeepai-main.vercel.app';
  const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  
  // Small test image (1x1 pixel PNG)
  const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/openai/upload-dive-image-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': ADMIN_USER_ID
      },
      body: JSON.stringify({
        imageData: testImageBase64,
        filename: 'test-image.png',
        description: 'Test image upload'
      })
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Result:', result);
    
    if (result.success) {
      console.log('✅ SUCCESS: Image uploaded with ID:', result.imageId);
    } else {
      console.log('❌ FAILED:', result.error);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
};

testImageUpload();
