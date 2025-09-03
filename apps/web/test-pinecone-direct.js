#!/usr/bin/env node

// Standalone Pinecone Test - No Next.js required
const { Pinecone } = require("@pinecone-database/pinecone");
const { OpenAI } = require("openai");
require('dotenv').config({ path: '.env.local' });

async function testPineconeDirectly() {
  console.log('🧪 STANDALONE PINECONE TEST');
  console.log('=' .repeat(50));
  
  // Check environment variables
  console.log('\n📋 Environment Check:');
  const apiKey = process.env.PINECONE_API_KEY;
  const index = process.env.PINECONE_INDEX;
  const openaiKey = process.env.OPENAI_API_KEY;
  
  console.log('PINECONE_API_KEY:', apiKey ? `✅ SET (${apiKey.length} chars)` : '❌ MISSING');
  console.log('PINECONE_INDEX:', index || '❌ MISSING');
  console.log('OPENAI_API_KEY:', openaiKey ? `✅ SET (${openaiKey.length} chars)` : '❌ MISSING');
  
  if (!apiKey || !index || !openaiKey) {
    console.log('\n❌ Missing required environment variables');
    return;
  }
  
  try {
    // Initialize clients
    console.log('\n🔧 Initializing clients...');
    const pinecone = new Pinecone({ apiKey });
    const pineconeIndex = pinecone.index(index);
    const openai = new OpenAI({ apiKey: openaiKey });
    
    // Test query
    const testQuery = "freediving safety blackout";
    console.log(`\n🔍 Testing query: "${testQuery}"`);
    
    // Generate embedding
    console.log('📊 Generating embedding...');
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: testQuery
    });
    
    console.log(`✅ Embedding generated (${embedding.data[0].embedding.length} dimensions)`);
    
    // Query Pinecone
    console.log('🔍 Querying Pinecone database...');
    const startTime = Date.now();
    
    const result = await pineconeIndex.query({
      vector: embedding.data[0].embedding,
      topK: 5,
      includeMetadata: true,
    });
    
    const queryTime = Date.now() - startTime;
    console.log(`⏱️  Query completed in ${queryTime}ms`);
    
    // Display results
    console.log('\n📊 RESULTS:');
    console.log(`Found ${result.matches?.length || 0} matches`);
    
    if (result.matches && result.matches.length > 0) {
      console.log('\n🎯 TOP MATCHES:');
      result.matches.forEach((match, i) => {
        console.log(`\n${i + 1}. Score: ${match.score?.toFixed(4)}`);
        console.log(`   ID: ${match.id}`);
        if (match.metadata?.text) {
          const text = match.metadata.text;
          console.log(`   Text: ${text.substring(0, 150)}${text.length > 150 ? '...' : ''}`);
        }
      });
      
      console.log('\n✅ SUCCESS: Pinecone is working correctly!');
      console.log('🔧 The issue is likely in the Next.js API routing or fetch calls.');
      
    } else {
      console.log('\n⚠️  No matches found');
      console.log('💡 This could mean:');
      console.log('   - The embedding model doesn\'t match the ingestion model');
      console.log('   - The query terms don\'t exist in your data');
      console.log('   - The similarity threshold is too high');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.message.includes('UNAUTHENTICATED')) {
      console.log('💡 Fix: Check your Pinecone API key');
    } else if (error.message.includes('NOT_FOUND')) {
      console.log('💡 Fix: Check your Pinecone index name');
    } else if (error.message.includes('network')) {
      console.log('💡 Fix: Check your internet connection');
    }
  }
}

// Run the test
testPineconeDirectly().catch(console.error);
