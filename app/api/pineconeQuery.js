// app/api/pineconeQuery.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const indexName = 'koval-deep-ai';
const pineconeHost = process.env.PINECONE_HOST;

if (!pineconeHost) {
  throw new Error('❌ PINECONE_HOST is not defined in .env.local');
}

const index = pinecone.Index(indexName); // ✅ Pinecone v1 method

async function getQueryEmbedding(query) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  return response.data[0].embedding;
}

async function queryPinecone(query) {
  const embedding = await getQueryEmbedding(query);

  try {
    const result = await index.query({
      topK: 3,
      vector: embedding,
      includeMetadata: true,
    });

    console.log('🔍 Query results:');
    result.matches.forEach((match, i) => {
      console.log(`\nResult #${i + 1}`);
      console.log(`Score: ${match.score}`);
      console.log(`Metadata:`, match.metadata);
    });

    return result;
  } catch (err) {
    console.error('❌ Error querying Pinecone:', err);
    throw err;
  }
}

// Example usage
const userQuery = 'How do I take a mouthfill in deep freediving?';

queryPinecone(userQuery).catch((err) => {
  console.error('❌ Query failed:', err);
});
