import type { NextApiRequest, NextApiResponse } from 'next';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const results: any = {
      environment: {},
      pinecone: {},
      openai: {},
    };

    // 1️⃣ Check environment variables
    results.environment = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing',
      PINECONE_API_KEY: process.env.PINECONE_API_KEY ? '✅ Set' : '❌ Missing',
      PINECONE_INDEX: process.env.PINECONE_INDEX || '❌ Missing',
    };

    // 2️⃣ Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });

    const indexName = process.env.PINECONE_INDEX || '';
    const index = pinecone.Index(indexName);

    // 3️⃣ Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });

    // 4️⃣ Generate test embedding
    const testQuery = "Verify Pinecone and OpenAI are connected.";
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: testQuery,
    });
    const vector = embedding.data[0].embedding;
    results.openai.embedding = vector ? '✅ Embedding generated' : '❌ Failed';

    // 5️⃣ Upsert test vector
    await index.upsert([
      {
        id: "verify-test-1",
        values: vector,
        metadata: { text: testQuery, source: "verify-endpoint" },
      },
    ]);
    results.pinecone.upsert = '✅ Test vector upserted';

    // 6️⃣ Query the vector back
    const queryResult = await index.query({
      vector,
      topK: 1,
      includeMetadata: true,
    });
    results.pinecone.query = queryResult.matches?.length
      ? '✅ Query successful'
      : '❌ No results returned';

    return res.status(200).json({
      status: 'success',
      results,
      sampleMatch: queryResult.matches?.[0] || {},
    });
  } catch (error: any) {
    console.error("❌ Verify endpoint error:", error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Unknown error',
    });
  }
}
