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
const index = pinecone.Index(indexName);

async function getQueryEmbedding(query) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  return response.data[0].embedding;
}

async function queryPinecone(query) {
  const embedding = await getQueryEmbedding(query);
  return index.query({
    topK: 3,
    vector: embedding,
    includeMetadata: true,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const result = await queryPinecone(query);
    res.status(200).json(result);
  } catch (err) {
    console.error('❌ Error querying Pinecone:', err);
    res.status(500).json({ error: 'Failed to query Pinecone' });
  }
}
