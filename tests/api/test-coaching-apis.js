// Test the new coaching APIs
const API_BASE = 'https://kovaldeepai-main.vercel.app';
const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

async function testEQPlan() {
  console.log('\n🎯 Testing EQ Plan API...');
  
  try {
    const response = await fetch(`${API_BASE}/api/coach/eq-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': ADMIN_USER_ID
      },
      body: JSON.stringify({
        targetDepth: 80,
        userId: ADMIN_USER_ID,
        discipline: 'CWT'
      })
    });

    const result = await response.json();
    console.log('EQ Plan Status:', response.status);
    console.log('EQ Plan Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('EQ Plan Test Error:', error.message);
  }
}

async function testENCLOSEDiagnose() {
  console.log('\n🔍 Testing ENCLOSE Diagnostic API...');
  
  try {
    const response = await fetch(`${API_BASE}/api/coach/enclose-diagnose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: "I couldn't equalize at 45m and my mouthfill disappeared"
      })
    });

    const result = await response.json();
    console.log('ENCLOSE Status:', response.status);
    console.log('ENCLOSE Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('ENCLOSE Test Error:', error.message);
  }
}

async function testCoachChat() {
  console.log('\n💬 Testing Coach Chat API...');
  
  try {
    const response = await fetch(`${API_BASE}/api/coach/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "I'm struggling with equalization at 50m, what should I do?",
        userId: ADMIN_USER_ID
      })
    });

    const result = await response.json();
    console.log('Chat Status:', response.status);
    console.log('Chat Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Chat Test Error:', error.message);
  }
}

async function runTests() {
  console.log('🧪 TESTING COACHING APIS');
  console.log('========================');
  
  await testEQPlan();
  await testENCLOSEDiagnose();
  await testCoachChat();
  
  console.log('\n✅ All tests completed!');
}

runTests().catch(console.error);
