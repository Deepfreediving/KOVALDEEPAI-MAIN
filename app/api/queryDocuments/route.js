import { NextResponse } from 'next/server';
import index from '../pineconeInit';

export async function POST(req) {
  try {
    const { indexName, vector } = await req.json();

    // Validate that the indexName and vector are present
    if (!indexName || !vector) {
      return NextResponse.json(
        { error: 'indexName or vector missing' },
        { status: 400 }
      );
    }

    // Validate the format of the vector (optional, assuming vector is a float array)
    if (!Array.isArray(vector) || vector.some(isNaN)) {
      return NextResponse.json(
        { error: 'Invalid vector format' },
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
