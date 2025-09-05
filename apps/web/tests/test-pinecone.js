// Test Pinecone connectivity directly
const { Pinecone } = require("@pinecone-database/pinecone");
const { OpenAI } = require("openai");
require('dotenv').config({ path: '.env.local' });

async function testPinecone() {
  console.log('🧪 Testing Pinecone Connectivity\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? 'SET ✅' : 'MISSING ❌');
  console.log('PINECONE_INDEX:', process.env.PINECONE_INDEX || 'MISSING ❌');
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET ✅' : 'MISSING ❌');
  
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX || !process.env.OPENAI_API_KEY) {
    console.log('\n❌ Missing required environment variables');
    return;
  }
  
  try {
    // Initialize clients
    console.log('\n🔧 Initializing Pinecone client...');
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pinecone.index(process.env.PINECONE_INDEX);
    
    console.log('🔧 Initializing OpenAI client...');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Test embedding generation
    console.log('\n🤖 Testing OpenAI embedding generation...');
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "freediving safety"
    });
    console.log('✅ Embedding generated successfully (length:', embedding.data[0].embedding.length, ')');
    
    // Test Pinecone query
    console.log('\n🔍 Testing Pinecone query...');
    const result = await index.query({
      vector: embedding.data[0].embedding,
      topK: 3,
      includeMetadata: true,
    });
    
    console.log('📊 Query Results:');
    console.log('- Matches found:', result.matches?.length || 0);
    
    if (result.matches && result.matches.length > 0) {
      console.log('✅ Pinecone is working! Sample results:');
      result.matches.forEach((match, i) => {
        console.log(`${i + 1}. Score: ${match.score?.toFixed(4)}`);
        console.log(`   Text: ${match.metadata?.text?.substring(0, 100)}...`);
      });
    } else {
      console.log('⚠️ No matches found - the Pinecone index might be empty');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('UNAUTHENTICATED')) {
      console.log('💡 Check your Pinecone API key');
    } else if (error.message.includes('NOT_FOUND')) {
      console.log('💡 Check your Pinecone index name');
    }
  }
}

testPinecone().catch(console.error);
