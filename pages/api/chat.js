import dotenv from 'dotenv';
dotenv.config();

import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

let index;
try {
  index = pinecone.Index(process.env.PINECONE_INDEX);
} catch (err) {
  console.error('❌ Pinecone index init error:', err.message);
}

// Step 1: Embed user query
async function getQueryEmbedding(query) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    return response?.data?.[0]?.embedding;
  } catch (err) {
    console.error('❌ Embedding generation failed:', err.message);
    throw new Error('Embedding generation failed.');
  }
}

// Step 2: Query Pinecone
async function queryPinecone(query) {
  const embedding = await getQueryEmbedding(query);
  if (!embedding) throw new Error('Embedding is undefined.');

  if (!index) {
    throw new Error('Pinecone index not initialized.');
  }

  try {
    const result = await index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    return result?.matches
      ?.map((m) => m.metadata?.text)
      .filter(Boolean) || [];
  } catch (err) {
    console.error('❌ Pinecone query error:', err.message);
    throw new Error('Pinecone vector search failed.');
  }
}

// Step 3: Ask GPT using context
async function askWithContext(contextChunks, question) {
  const context = contextChunks.join('\n\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant. Only answer using the provided context. If it is not found in the context, respond with "I don’t know."',
        },
        {
          role: 'user',
          content: `Context:\n${context}\n\nQuestion: ${question}`,
        },
      ],
      temperature: 0.2,
    });

    return response?.choices?.[0]?.message?.content?.trim() || 'No answer generated.';
  } catch (err) {
    console.error('❌ OpenAI chat completion error:', err.message);
    throw new Error('Failed to generate chat response.');
  }
}

// ✅ Main API Route Handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message must be a non-empty string.' });
  }

  try {
    const contextChunks = await queryPinecone(message);

    if (contextChunks.length === 0) {
      return res.status(200).json({
        assistantMessage: {
          role: 'assistant',
          content: '⚠️ I couldn’t find relevant information for your question.',
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
    console.error('❌ /api/chat internal error:', err.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
