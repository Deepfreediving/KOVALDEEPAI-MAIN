import { PineconeClient } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // OpenAI API Key from environment variables
});

// Initialize Pinecone Client (Corrected instantiation)
const pinecone = new PineconeClient();

pinecone.init({
  apiKey: process.env.PINECONE_API_KEY,  // Pinecone API Key
  environment: 'us-west1-gcp',  // Environment: check the correct one for your region
});

// Function to get relevant documents from Pinecone
async function getRelevantDocuments(query) {
  const index = pinecone.Index('your-index-name');  // Replace with your actual Pinecone index name

  // Query Pinecone using OpenAI embeddings
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });

  // Search Pinecone index using the query embedding
  const queryResponse = await index.query({
    vector: queryEmbedding.data[0].embedding,
    top_k: 3,  // Fetch top 3 documents
    includeMetadata: true,  // Include metadata with results
  });

  // Extract and return the relevant documents
  const relevantDocs = queryResponse.matches.map((match) => match.metadata.text);
  return relevantDocs;
}

// API route for handling the query
export async function POST(req) {
  const { query } = await req.json();

  if (!query) {
    return new Response(
      JSON.stringify({ error: 'Query is required' }),
      { status: 400 }
    );
  }

  try {
    const relevantDocs = await getRelevantDocuments(query);

    // Generate a response using OpenAI
    const response = await openai.completions.create({
      model: 'gpt-4',
      prompt: `Answer the following question using the provided documents:\n\nQuestion: ${query}\n\nDocuments: ${relevantDocs.join("\n")}`,
      max_tokens: 500,
    });

    return new Response(
      JSON.stringify({ response: response.choices[0].text.trim() }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing query:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process the query' }),
      { status: 500 }
    );
  }
}
