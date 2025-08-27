// Quick test script to check dive log saving
const testDiveLog = {
  diveDate: '2025-08-18',
  discipline: 'Constant Weight',
  location: 'Blue Hole',
  targetDepth: 50,
  reachedDepth: 45,
  totalTime: '2:30',
  notes: 'Test dive log for debugging',
  mouthfillDepth: 30,
  issueDepth: null,
  squeeze: false,
  exit: 'Clean',
  attemptType: 'Training',
  issueComment: '',
  surfaceProtocol: 'OK'
};

async function testSaveDiveLog() {
  try {
    console.log('🧪 Testing dive log save API...');
    
    const response = await fetch('http://localhost:3001/api/supabase/save-dive-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testDiveLog)
    });

    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Success:', result);
    } else {
      const error = await response.text();
      console.log('❌ Error response:', error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSaveDiveLog();
