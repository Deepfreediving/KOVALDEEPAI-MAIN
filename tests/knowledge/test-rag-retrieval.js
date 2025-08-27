// Test what chunks are actually being retrieved from Pinecone
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const index = pinecone.index('koval-deep-ai');

async function testRetrieval() {
  console.log('🔍 TESTING RAG RETRIEVAL FROM YOUR KNOWLEDGE BASE');
  console.log('=================================================');
  
  try {
    const query = 'mouthfill depth calculation reverse pack equalization progression';
    
    console.log(`\n📝 Query: "${query}"`);
    
    // Get embedding
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    
    console.log(`✅ Generated embedding (${embedding.data[0].embedding.length} dimensions)`);
    
    // Search without filters first
    console.log('\n🔍 Searching without filters...');
    const allResults = await index.query({
      vector: embedding.data[0].embedding,
      topK: 5,
      includeMetadata: true,
    });
    
    console.log(`📊 Found ${allResults.matches.length} matches`);
    allResults.matches.forEach((match, i) => {
      console.log(`\n${i+1}. Score: ${match.score.toFixed(4)}`);
      console.log(`   Topic: ${match.metadata?.topic || 'unknown'}`);
      console.log(`   File: ${match.metadata?.file_path || 'unknown'}`);
      console.log(`   Text preview: ${(match.metadata?.text || '').substring(0, 100)}...`);
    });
    
    // Search with topic filters
    console.log('\n\n🔍 Searching with topic filters...');
    const filteredResults = await index.query({
      vector: embedding.data[0].embedding,
      topK: 5,
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
    
    console.log(`📊 Found ${filteredResults.matches.length} filtered matches`);
    filteredResults.matches.forEach((match, i) => {
      console.log(`\n${i+1}. Score: ${match.score.toFixed(4)}`);
      console.log(`   Topic: ${match.metadata?.topic || 'unknown'}`);
      console.log(`   File: ${match.metadata?.file_path || 'unknown'}`);
      console.log(`   Text preview: ${(match.metadata?.text || '').substring(0, 100)}...`);
    });
    
    // Show what topics actually exist
    console.log('\n\n📋 WHAT TOPICS EXIST IN YOUR DATA:');
    const sampleResults = await index.query({
      vector: embedding.data[0].embedding,
      topK: 20,
      includeMetadata: true,
    });
    
    const topics = [...new Set(sampleResults.matches.map(m => m.metadata?.topic).filter(Boolean))];
    console.log(`Available topics: ${topics.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error testing retrieval:', error.message);
  }
}

testRetrieval();
