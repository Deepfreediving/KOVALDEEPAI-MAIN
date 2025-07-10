import { NextResponse } from 'next/server';
import { PineconeClient } from '@pinecone-database/pinecone';

// Initialize Pinecone client
const pinecone = new PineconeClient();
pinecone.init({
  apiKey: process.env.PINECONE_API_KEY || '',
  environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp', // Replace with correct environment
});

export async function POST(req) {
  try {
    const { indexName, vector } = await req.json();

    if (!indexName || !vector) {
      return NextResponse.json(
        { error: 'indexName or vector missing' },
        { status: 400 }
      );
    }

    // Query Pinecone to find the most relevant documents
    const index = pinecone.Index(indexName);
    const result = await index.query({
      vector,
      topK: 10,
    });

    return NextResponse.json({ matches: result.matches || [] });
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    return NextResponse.json(
      { error: 'Failed to query Pinecone' },
      { status: 500 }
    );
  }
}

export const config = {
  runtime: 'nodejs',
};
