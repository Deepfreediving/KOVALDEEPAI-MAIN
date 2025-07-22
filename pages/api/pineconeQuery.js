require('dotenv').config();

const { OpenAI } = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');

// Validate env variables early
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX || 'koval-deep-ai';

if (!OPENAI_API_KEY || !PINECONE_API_KEY || !PINECONE_INDEX_NAME) {
  throw new Error('❌ Missing one or more required .env variables: OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX');
}

// Initialize OpenAI and Pinecone clients
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const index = pinecone.Index(PINECONE_INDEX_NAME);

// Get embedding for the user query
async function getQueryEmbedding(query) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // ✅ Match the ingestion model
      input: query,
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error('❌ Error generating embedding:', err);
    throw new Error('Failed to generate query embedding');
  }
}

// Query Pinecone with the embedding
async function queryPinecone(query) {
  try {
    const embedding = await getQueryEmbedding(query);
    const result = await index.query({
      topK: 5, // You can adjust this depending on how many chunks you want returned
      vector: embedding,
      includeMetadata: true,
    });
    return result;
  } catch (err) {
    console.error('❌ Error querying Pinecone:', err);
    throw new Error('Failed to query Pinecone');
  }
}

// API route handler (Next.js or Express style)
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query must be a string' });
  }

  try {
    const result = await queryPinecone(query);
    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Handler error:', err.message || err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
