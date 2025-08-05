require('dotenv').config();
const { OpenAI } = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');
import handleCors from '@/utils/handleCors'; // ✅ CHANGED from require to import

// Initialize OpenAI and Pinecone clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// Get the index
const index = pinecone.index(process.env.PINECONE_INDEX || 'koval-deep-ai');

// Get embedding for the user's query
async function getQueryEmbedding(query) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // ✅ Match the ingestion model
      input: query,
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error('❌ Error generating embedding:', err.message);
    throw err;
  }
}

// Query Pinecone using embedding
async function queryPineconeAndSearchDocs(query) {
  try {
    const embedding = await getQueryEmbedding(query);

    const result = await index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    // Ensure there are matches before mapping
    if (result.matches && result.matches.length > 0) {
      return result.matches
        .map((match) => match?.metadata?.text || '')
        .filter((text) => text.trim() !== '');
    } else {
      return [];
    }
  } catch (err) {
    console.error('❌ Error querying Pinecone:', err.message);
    throw new Error('Failed to query Pinecone');
  }
}

// Ask GPT with vector context
async function askGPTWithContext(chunks, question) {
  const context = chunks.join('\n\n---\n\n'); // separator improves clarity

  const messages = [
    {
      role: 'system',
      content:
        'You are a helpful assistant answering user questions strictly based on the provided context. If the answer is not in the context, reply "I don’t know."',
    },
    {
      role: 'user',
      content: `Context:\n${context}\n\nQuestion: ${question}`,
    },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.2,
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error('❌ GPT error:', err.message);
    throw err;
  }
}

// API handler
module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query must be a string' });
  }

  try {
    const chunks = await queryPineconeAndSearchDocs(query);

    if (chunks.length === 0) {
      return res
        .status(200)
        .json({ answer: "I couldn’t find any relevant information in the documents." });
    }

    const answer = await askGPTWithContext(chunks, query);
    return res.status(200).json({ answer });
  } catch (err) {
    console.error('❌ Handler error:', err.message || err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
