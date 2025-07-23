// Load environment variables
require('dotenv').config();

const { OpenAI } = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');

// Validate environment variables early
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX || 'koval-deep-ai';

// Check if necessary environment variables are defined
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
      model: 'text-embedding-3-small', // Match the ingestion model
      input: query,
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error('❌ Error generating embedding:', err.message || err);
    throw new Error('Failed to generate query embedding');
  }
}

// Query Pinecone with the embedding
async function queryPinecone(query) {
  try {
    const embedding = await getQueryEmbedding(query);
    const result = await index.query({
      topK: 5, // Number of chunks to return
      vector: embedding,
      includeMetadata: true,
    });
    return result.matches || [];
  } catch (err) {
    console.error('❌ Error querying Pinecone:', err.message || err);
    throw new Error('Failed to query Pinecone');
  }
}

// API route handler
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query } = req.body;

  // Validate the query input
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query must be a string' });
  }

  try {
    const matches = await queryPinecone(query);

    if (matches.length === 0) {
      return res.status(200).json({ answer: "I couldn’t find any relevant information in the documents." });
    }

    // Join the matched text chunks
    const context = matches.map((match) => match.metadata?.text).join('\n\n');
    
    // Send query and context to GPT-4 for response
    const answer = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an assistant answering questions based strictly on the provided context.' },
        { role: 'user', content: `Context:\n${context}\n\nQuestion: ${query}` },
      ],
      temperature: 0.2,  // Lower temperature to prioritize accuracy
    });

    return res.status(200).json({ answer: answer.choices[0].message.content.trim() });
  } catch (err) {
    console.error('❌ Handler error:', err.message || err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
