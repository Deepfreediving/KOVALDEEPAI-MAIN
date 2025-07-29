import 'dotenv/config';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

async function runTest() {
  console.log("🚀 Starting Pinecone + OpenAI test...");

  try {
    // Initialize Pinecone client
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });

    const indexName = process.env.PINECONE_INDEX || '';
    const index = pinecone.Index(indexName);

    // Create OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });

    // Generate test embedding
    const testQuery = "Test connection to Pinecone vector DB";
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: testQuery,
    });

    const vector = embedding.data[0].embedding;

    // Upsert test vector
    await index.upsert([
      {
        id: "test-vector-1",
        values: vector,
        metadata: { text: testQuery, source: "connectivity-test" },
      },
    ]);
    console.log("✅ Successfully upserted test vector.");

    // Query vector
    const queryResult = await index.query({
      vector,
      topK: 1,
      includeMetadata: true,
    });

    console.log("🔍 Query Result:", JSON.stringify(queryResult, null, 2));
    console.log("🎉 Pinecone test completed successfully.");
  } catch (error: any) {
    console.error("❌ Pinecone test failed:", error.message || error);
  }
}

runTest();
