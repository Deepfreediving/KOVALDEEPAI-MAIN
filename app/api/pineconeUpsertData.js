// app/api/pineconeUpsertData.js
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

const index = pinecone.Index(indexName); // ✅ Correct for Pinecone v1 SDK

async function getEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function upsertDataToPinecone(index, data) {
  const vectors = data.map((item) => ({
    id: item.id,
    values: item.embedding,
    metadata: { text: item.text },
  }));

  console.log('📦 Vectors prepared for upsert:', vectors);

  try {
    const response = await index.upsert(vectors);// ✅ correct for Pinecone v1 SDK
    console.log('✅ Upsert response:', response);
    return response;
  } catch (error) {
    console.error('❌ Error upserting data to Pinecone:', error);
    throw error;
  }
}

async function run() {
  const docs = [
    {
      id: 'doc-1',
      text: 'Daniel Koval freediving protocol on mouthfill control',
    },
    {
      id: 'doc-2',
      text: 'Freediving warm-up structure for depth progression',
    },
  ];

  const embeddedDocs = [];

  for (const doc of docs) {
    const embedding = await getEmbedding(doc.text);
    embeddedDocs.push({
      id: doc.id,
      text: doc.text,
      embedding,
    });
  }

  await upsertDataToPinecone(index, embeddedDocs);
}

run().catch((err) => {
  console.error('❌ Upsert failed:', err);
});
