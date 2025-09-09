// Test OpenAI API connection with fixed configuration
const OpenAI = require('openai');

async function testOpenAIFixed() {
  console.log('🔧 Testing Fixed OpenAI Configuration...');
  
  try {
    // Test without organization (as recommended)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // No organization header
    });
    
    console.log('\n📡 Testing chat completion with gpt-4...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are Koval AI, a freediving coach. Respond briefly.'
        },
        {
          role: 'user',
          content: 'Hello! Can you help me with freediving?'
        }
      ],
      max_tokens: 50
    });
    
    console.log('✅ OpenAI API is working perfectly!');
    console.log('🤖 Response:', response.choices[0].message.content);
    console.log('💰 Tokens used:', response.usage?.total_tokens);
    
    // Test with gpt-3.5-turbo as backup
    console.log('\n📡 Testing with gpt-3.5-turbo as backup...');
    const backupResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Quick test' }],
      max_tokens: 10
    });
    
    console.log('✅ Backup model also working!');
    console.log('🔄 Both models are available');
    
  } catch (error) {
    console.log('❌ Still having issues:', error.message);
    console.log('Status:', error.status);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });
testOpenAIFixed();
