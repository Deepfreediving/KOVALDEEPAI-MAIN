// Test OpenAI Vision API with updated configuration
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // No organization header - removed to fix auth issues
});

async function testVisionAPI() {
  console.log('🧪 Testing OpenAI Vision API...');
  console.log('📦 Model:', process.env.OPENAI_MODEL || 'gpt-4o');
  
  try {
    // Test with a simple base64 encoded test image (1x1 pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI/q2hcBAAAAABJRU5ErkJggg==';
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Vision-capable model
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What do you see in this image?' },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${testImageBase64}`,
                detail: 'low'
              }
            }
          ]
        }
      ],
      max_tokens: 100,
      temperature: 0.1
    });

    console.log('✅ Vision API Response:', response.choices[0].message.content);
    console.log('🔢 Tokens used:', response.usage?.total_tokens);
    console.log('💰 Model used:', response.model);
    
  } catch (error) {
    console.error('❌ Vision API Error:', error.message);
    if (error.response?.data) {
      console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Test regular chat API too
async function testChatAPI() {
  console.log('\n🧪 Testing OpenAI Chat API...');
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', 
      messages: [
        {
          role: 'user',
          content: 'Hello! Can you tell me about freediving safety?'
        }
      ],
      max_tokens: 100,
      temperature: 0.1
    });

    console.log('✅ Chat API Response:', response.choices[0].message.content);
    console.log('🔢 Tokens used:', response.usage?.total_tokens);
    
  } catch (error) {
    console.error('❌ Chat API Error:', error.message);
    if (error.response?.data) {
      console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function runTests() {
  console.log('🚀 Testing OpenAI APIs with gpt-4o (Vision-capable model)');
  console.log('=' * 50);
  
  await testChatAPI();
  await testVisionAPI();
  
  console.log('\n✨ Tests completed!');
}

runTests().catch(console.error);
