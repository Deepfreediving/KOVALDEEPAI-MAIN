// Simple API test
const testAPI = async () => {
  console.log('Testing API...');
  
  const PRODUCTION_URL = 'https://kovaldeepai-main.vercel.app';
  const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  
  // Test dive log submission
  const testData = {
    user_id: ADMIN_USER_ID,
    date: new Date().toISOString().split('T')[0],
    discipline: 'Test Dive',
    location: 'Test Location',
    target_depth: 20,
    reached_depth: 18,
    mouthfill_depth: 10,
    squeeze: false,
    notes: 'Simple test dive'
  };
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': ADMIN_USER_ID
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Result:', result);
    
    if (result.success) {
      console.log('✅ SUCCESS: Dive log saved with ID:', result.diveLogId);
    } else {
      console.log('❌ FAILED:', result.error);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
};

testAPI();
