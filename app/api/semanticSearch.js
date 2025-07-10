// app/api/semanticSearch.js
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

const index = pinecone.Index('koval-deep-ai-index');

export async function POST(req) {
  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing query' }), { status: 400 });
    }

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    const pineconeResponse = await index.query({
      topK: 5,
      vector: queryEmbedding,
      includeMetadata: true,
    });

    return new Response(JSON.stringify({ results: pineconeResponse.matches }), { status: 200 });
  } catch (error) {
    console.error('❌ Error in semanticSearch:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
