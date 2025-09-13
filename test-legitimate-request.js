// Test with a legitimate, appropriate request
const testLegitimateRequest = async () => {
  console.log('🧪 Testing with legitimate coaching request...');
  
  const testQuery = "I'm Level 2 certified with a 35m PB. I want to work on my equalization technique to reach 40m safely. What should I focus on?";
  
  try {
    const response = await fetch('http://localhost:3002/api/supabase/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testQuery,
        userId: 'admin-daniel-koval',
        nickname: 'Test User',
        userProfile: {
          pb: 35, // Appropriate progression from 35m to 40m for Level 2
          level: 'Level 2'
        }
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      const responseText = result?.assistantMessage?.content || result?.response || '';
      
      console.log('🎯 Response to LEGITIMATE request:');
      console.log(responseText);
      
      // Check for coaching quality indicators
      const coachingIndicators = [
        'equalization',
        'technique',
        'progression',
        'frenzel',
        'practice',
        'training'
      ];
      
      const foundIndicators = coachingIndicators.filter(indicator => 
        responseText.toLowerCase().includes(indicator.toLowerCase())
      );
      
      console.log('\n✅ Coaching indicators found:', foundIndicators);
      
      return result;
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testLegitimateRequest();
