// Quick verification script to test core functionality

async function quickVerification() {
  console.log('🔍 QUICK SYSTEM VERIFICATION');
  console.log('============================');
  
  const PRODUCTION_URL = 'https://kovaldeepai-main.vercel.app';
  const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  
  try {
    // Test 1: Check if API is responding
    console.log('\n1️⃣ Testing API Health...');
    const healthResponse = await fetch(`${PRODUCTION_URL}/api/health`);
    console.log(`API Health Status: ${healthResponse.status}`);
    
    // Test 2: Submit a test dive log
    console.log('\n2️⃣ Testing Dive Log Submission...');
    const testDiveLog = {
      user_id: ADMIN_USER_ID,
      session_date: new Date().toISOString(),
      location: 'Test Location - Quick Verification',
      depth_achieved: 25,
      bottom_time_seconds: 45,
      surface_interval_minutes: 3,
      water_temp_celsius: 22,
      visibility_meters: 15,
      conditions: 'Calm seas - Test conditions',
      mouthfill_depth: 12,
      issue_depth: null,
      squeeze: false,
      freediving_level: 'intermediate',
      notes: 'Quick verification test log entry'
    };
    
    const diveLogResponse = await fetch(`${PRODUCTION_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': ADMIN_USER_ID
      },
      body: JSON.stringify(testDiveLog)
    });
    
    const diveLogResult = await diveLogResponse.json();
    console.log(`Dive Log Save Status: ${diveLogResponse.status}`);
    console.log('Result:', diveLogResult);
    
    if (diveLogResult.success) {
      console.log('✅ Dive log saved successfully with ID:', diveLogResult.diveLogId);
    } else {
      console.log('❌ Dive log save failed:', diveLogResult.error);
    }
    
    // Test 3: Test image upload capability
    console.log('\n3️⃣ Testing Image Upload Capability...');
    
    // Create a small test image (1x1 pixel base64)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const imageUploadResponse = await fetch(`${PRODUCTION_URL}/api/openai/upload-dive-image-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': ADMIN_USER_ID
      },
      body: JSON.stringify({
        imageData: testImageBase64,
        filename: 'test-verification-image.png',
        description: 'Quick verification test image'
      })
    });
    
    const imageResult = await imageUploadResponse.json();
    console.log(`Image Upload Status: ${imageUploadResponse.status}`);
    console.log('Image Result:', imageResult);
    
    if (imageResult.success) {
      console.log('✅ Image upload working correctly');
    } else {
      console.log('❌ Image upload failed:', imageResult.error);
    }
    
    console.log('\n🎯 VERIFICATION COMPLETE');
    console.log('========================');
    console.log('✅ Production site is accessible');
    console.log(`✅ API health check: ${healthResponse.status === 200 ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Dive log submission: ${diveLogResult.success ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Image upload: ${imageResult.success ? 'PASSED' : 'FAILED'}`);
    
  } catch (error) {
    console.error('❌ Verification failed with error:', error.message);
  }
}

// Run the verification
quickVerification().catch(console.error);
