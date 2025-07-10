import { NextResponse } from 'next/server';
import index from './pineconeInit'; // Import the Pinecone index

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
    const result = await index.query({
      vector,
      topK: 10, // Number of similar items you want to retrieve
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
