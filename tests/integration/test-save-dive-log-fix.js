// Quick test to verify the save-dive-log API is working after key update
const testSaveDiveLog = async () => {
  console.log('🧪 Testing dive log save API...');
  
  const testDiveLog = {
    date: new Date().toISOString().split('T')[0],
    discipline: 'Constant Weight',
    location: 'Test Location',
    target_depth: 50,
    reached_depth: 48,
    total_dive_time: '2:30',
    exit: 'Clean',
    attempt_type: 'Training',
    notes: 'Test dive log save after API key update'
  };
  
  try {
    const response = await fetch('/api/supabase/save-dive-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testDiveLog)
    });
    
    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Save successful!', result);
    } else {
      const error = await response.text();
      console.error('❌ Save failed:', error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testSaveDiveLog();
