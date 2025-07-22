import dotenv from 'dotenv';
dotenv.config();

import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Init OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Init Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const index = pinecone.Index(process.env.PINECONE_INDEX);

// Step 1: Embed user query
async function getQueryEmbedding(query) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });

  return response.data[0]?.embedding;
}

// Step 2: Query Pinecone with the embedding
async function queryPinecone(query) {
  const embedding = await getQueryEmbedding(query);
  if (!embedding) throw new Error('Failed to generate embedding');

  const result = await index.query({
    vector: embedding,
    topK: 5,
    includeMetadata: true,
  });

  return result.matches.map((m) => m.metadata?.text).filter(Boolean);
}

// Step 3: Ask GPT using Pinecone context
async function askWithContext(contextChunks, question) {
  const context = contextChunks.join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant. Answer only using the provided context. If not found, say "I don’t know."',
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
    temperature: 0.2,
  });

  return response.choices?.[0]?.message?.content?.trim() || 'No response.';
}

// ✅ API Route handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const contextChunks = await queryPinecone(message);

    if (contextChunks.length === 0) {
      return res.status(200).json({
        assistantMessage: {
          role: 'assistant',
          content: '⚠️ I couldn’t find relevant info for your question.',
        },
      });
    }

    const answer = await askWithContext(contextChunks, message);
    return res.status(200).json({
      assistantMessage: {
        role: 'assistant',
        content: answer,
      },
    });
  } catch (err) {
    console.error('❌ API /chat error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
