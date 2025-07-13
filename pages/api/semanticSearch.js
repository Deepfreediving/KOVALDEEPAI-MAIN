import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone client
const pinecone = new Pinecone();
const index = pinecone.Index(process.env.PINECONE_INDEX);  // Use your actual Pinecone index name from environment variables

// Semantic search function
export async function semanticSearch(query) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    throw new Error('Invalid query.');
  }

  // Create the embedding for the query using OpenAI
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });

  const queryEmbedding = embeddingResponse.data[0].embedding;

  // Query Pinecone for similar vectors
  const pineconeResponse = await index.query({
    vector: queryEmbedding,
    topK: 5,
    includeMetadata: true,
  });

  return pineconeResponse.matches;
}

// API handler to process requests
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // Perform semantic search
    const results = await semanticSearch(query);
    res.status(200).json(results);  // Return the results from Pinecone
  } catch (error) {
    console.error("Error in semanticSearch:", error);
    res.status(500).json({ error: 'Failed to perform semantic search.' });
  }
}
