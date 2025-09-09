// Test OpenAI API connection
const OpenAI = require('openai');

async function testOpenAI() {
  console.log('🔍 Testing OpenAI Configuration...');
  console.log('API Key (first 20 chars):', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');
  console.log('Organization:', process.env.OPENAI_ORG);
  console.log('Model:', process.env.OPENAI_MODEL);
  
  try {
    // Test with organization
    const openaiWithOrg = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG,
    });
    
    console.log('\n📡 Testing with organization header...');
    const responseWithOrg = await openaiWithOrg.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Test message' }],
      max_tokens: 10
    });
    
    console.log('✅ Success with organization!');
    
  } catch (error) {
    console.log('❌ Failed with organization:', error.message);
    
    // Test without organization
    try {
      console.log('\n📡 Testing without organization header...');
      const openaiNoOrg = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      const responseNoOrg = await openaiNoOrg.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test message' }],
        max_tokens: 10
      });
      
      console.log('✅ Success without organization!');
      console.log('💡 Recommendation: Remove OPENAI_ORG from .env.local');
      
    } catch (error2) {
      console.log('❌ Failed without organization too:', error2.message);
      
      // Test if API key is valid by checking available models
      try {
        console.log('\n📡 Testing API key validity by listing models...');
        const openaiTest = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        const models = await openaiTest.models.list();
        console.log('✅ API key is valid - can list models');
        console.log('Available models:', models.data.slice(0, 3).map(m => m.id));
      } catch (error3) {
        console.log('❌ API key appears invalid:', error3.message);
      }
    }
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });
testOpenAI();
