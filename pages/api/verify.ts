// pages/api/verify.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import axios from 'axios';
import handleCors from '@/utils/handleCors'; // ✅ CHANGED from cors to handleCors

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (await handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const results: any = {
    environment: {},
    wix: {},
    openai: {},
    pinecone: {},
  };

  try {
    // 1️⃣ Environment checks
    results.environment = {
      WIX_API_KEY: process.env.WIX_API_KEY ? '✅ Set' : '❌ Missing',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing',
      PINECONE_API_KEY: process.env.PINECONE_API_KEY ? '✅ Set' : '❌ Missing',
      PINECONE_INDEX: process.env.PINECONE_INDEX || '❌ Missing',
    };

    // 2️⃣ Wix check
    try {
      await axios.post(
        'https://www.wixapis.com/wix-data/v2/items/query',
        { data: {} },
        {
          headers: {
            Authorization: `Bearer ${process.env.WIX_API_KEY}`,
            'wix-account-id': process.env.WIX_ACCOUNT_ID || '',
            'wix-site-id': process.env.WIX_SITE_ID || '',
            'Content-Type': 'application/json',
          },
        }
      );
      results.wix.status = '✅ OK';
    } catch (err: any) {
      results.wix.status = `❌ Failed: ${err?.message || 'Unknown error'}`;
    }

    // 3️⃣ OpenAI check
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'Verify OpenAI connection.',
      });
      results.openai.embedding = embedding?.data?.length ? '✅ Embedding generated' : '❌ Failed';
    } catch (err: any) {
      results.openai.embedding = `❌ Failed: ${err?.message || 'Unknown error'}`;
    }

    // 4️⃣ Pinecone check
    try {
      const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });
      const indexName = process.env.PINECONE_INDEX || '';
      const index = pinecone.index(indexName);

      // Test upsert
      const vector = [0.1, 0.2, 0.3]; // small test vector
      await index.upsert([{ id: 'verify-test-1', values: vector, metadata: { text: 'verify' } }]);
      results.pinecone.upsert = '✅ Test vector upserted';

      // Test query
      const queryResult = await index.query({ vector, topK: 1, includeMetadata: true });
      results.pinecone.query = queryResult.matches?.length
        ? '✅ Query successful'
        : '❌ No results returned';
    } catch (err: any) {
      results.pinecone.upsert = `❌ Failed: ${err?.message || 'Unknown error'}`;
    }

    return res.status(200).json({ status: 'success', results });
  } catch (error: any) {
    console.error('❌ Verify endpoint error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Unknown error' });
  }
}
