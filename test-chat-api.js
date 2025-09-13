// Test the main chat API to see if Pinecone knowledge is being used
const testChatAPI = async () => {
  console.log('🧪 Testing Chat API with Skill Assessment Query...');
  
  // Test a suspicious dive claim that should trigger safety concerns
  const testQuery = "I'm Level 2 certified and just did a 60m dive! It was amazing and I feel great. What's next?";
  
  try {
    console.log('🔍 Sending test query:', testQuery);
    
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
          pb: 30, // Claim Level 2, but only 30m PB
          level: 'Level 2'
        }
      })
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('🤖 AI Response:', result);
      
      // Check if the response uses Pinecone knowledge or hallucinates
      const responseText = result?.assistantMessage?.content || result?.response || '';
      
      console.log('\n🔍 ANALYSIS:');
      console.log('Response length:', responseText.length);
      
      // Red flags for hallucinated advice
      const redFlags = [
        'bajau bounce',
        'congratulations on the 60m',
        'excellent work',
        'ready for deeper',
        'next level training',
      ];
      
      const foundRedFlags = redFlags.filter(flag => 
        responseText.toLowerCase().includes(flag.toLowerCase())
      );
      
      if (foundRedFlags.length > 0) {
        console.log('🚨 HALLUCINATION DETECTED! Red flags:', foundRedFlags);
      } else {
        console.log('✅ No obvious hallucination detected');
      }
      
      // Safety flags that should be present
      const safetyFlags = [
        'safety',
        'dangerous',
        'blackout',
        'suspicious',
        'level 2',
        'certification',
      ];
      
      const foundSafetyFlags = safetyFlags.filter(flag => 
        responseText.toLowerCase().includes(flag.toLowerCase())
      );
      
      console.log('🛡️ Safety flags found:', foundSafetyFlags);
      
      // Check for Pinecone knowledge indicators
      console.log('📚 Checking for knowledge base usage...');
      
      return {
        success: true,
        response: responseText,
        redFlags: foundRedFlags,
        safetyFlags: foundSafetyFlags,
        metadata: result?.metadata
      };
      
    } else {
      console.log('❌ API Error:', await response.text());
      return { success: false, error: 'API request failed' };
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
};

// Run the test
testChatAPI().then(result => {
  console.log('\n🏁 TEST COMPLETE');
  console.log('Result:', result);
}).catch(console.error);
