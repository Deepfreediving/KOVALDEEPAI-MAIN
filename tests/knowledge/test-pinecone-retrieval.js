// Test if knowledge base retrieval is working
require('dotenv').config({ path: '.env.local' });

const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai').default;

async function testKnowledgeRetrieval() {
  console.log('🔍 TESTING KNOWLEDGE BASE RETRIEVAL');
  console.log('====================================');
  
  // Check environment
  console.log('Environment check:');
  console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? 'Set ✅' : 'Missing ❌');
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set ✅' : 'Missing ❌');
  
  if (!process.env.PINECONE_API_KEY || !process.env.OPENAI_API_KEY) {
    console.log('❌ Missing API keys - check .env.local file');
    return;
  }
  
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const index = pinecone.index('koval-deep-ai');
    
    console.log('\n📊 Testing Pinecone index access...');
    
    // Test 1: Get index stats
    try {
      const stats = await index.describeIndexStats();
      console.log('✅ Index stats:', {
        totalVectorCount: stats.totalVectorCount,
        dimension: stats.dimension
      });
    } catch (error) {
      console.log('❌ Index access failed:', error.message);
      return;
    }
    
    console.log('\n🔎 Testing knowledge retrieval...');
    
    // Test 2: Search for mouthfill knowledge
    const testQueries = [
      'mouthfill depth calculation reverse pack',
      'equalization progression 5m 3m intervals',
      'safety rules mouthfill never deeper than half'
    ];
    
    for (const query of testQueries) {
      console.log(`\n🔍 Query: "${query}"`);
      
      try {
        // Get embedding
        const embedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: query,
        });
        
        // Search Pinecone
        const results = await index.query({
          vector: embedding.data[0].embedding,
          topK: 3,
          includeMetadata: true,
          filter: {
            $or: [
              { topic: 'mouthfill' },
              { topic: 'equalization' },
              { topic: 'reverse_pack' },
              { topic: 'progression' }
            ]
          }
        });
        
        console.log(`📝 Found ${results.matches.length} relevant chunks:`);
        results.matches.forEach((match, i) => {
          console.log(`   ${i + 1}. Score: ${match.score.toFixed(3)} | Topic: ${match.metadata?.topic || 'unknown'}`);
          console.log(`      Text preview: ${(match.metadata?.text || 'No text').substring(0, 100)}...`);
        });
        
      } catch (error) {
        console.log(`❌ Query failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testKnowledgeRetrieval().catch(console.error);
