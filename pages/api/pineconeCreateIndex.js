import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize Pinecone client
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  controllerHostUrl: process.env.PINECONE_HOST, // ✅ Use full Pinecone host URL
});

// Specify the index name
const indexName = 'koval-deep-ai'; // Your created index

// Query function
export async function POST(req) {
  try {
    const { vector } = await req.json();

    if (!vector) {
      return NextResponse.json({ error: 'Vector missing' }, { status: 400 });
    }

    const index = pc.Index(indexName); // Use the created index
    const result = await index.query({
      vector, // The query vector that will be matched against the index
      topK: 10, // Retrieve the top 10 most similar results
    });

    return NextResponse.json({ matches: result.matches || [] });
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    return NextResponse.json({ error: 'Failed to query Pinecone' }, { status: 500 });
  }
}

export const config = {
  runtime: 'nodejs',
};
