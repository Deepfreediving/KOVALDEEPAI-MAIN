import { NextApiRequest, NextApiResponse } from 'next';

async function queryPinecone(query: string): Promise<string[]> {
  if (!query?.trim()) {
    console.log('❌ Empty query provided');
    return [];
  }
  
  try {
    // ✅ FIX: Always use production URL for internal API calls to avoid auth issues
    const baseUrl = process.env.BASE_URL || 'https://kovaldeepai-main.vercel.app';

    console.log(`🔍 Querying Pinecone via: ${baseUrl}/api/pinecone/pineconequery-gpt`);
    console.log(`🔍 Query: "${query}"`);

    // ✅ Use pineconequery-gpt endpoint
    const response = await fetch(`${baseUrl}/api/pinecone/pineconequery-gpt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        returnChunks: true
      })
    });

    console.log(`📡 Response status: ${response.status}`);
    console.log(`📡 Response ok: ${response.ok}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`⚠️ Pinecone query failed with status ${response.status}: ${errorText}`);
      return [];
    }

    const result = await response.json();
    console.log(`✅ Pinecone returned result:`, result);
    console.log(`✅ Pinecone returned ${result.chunks?.length || 0} knowledge chunks`);
    
    // ✅ FIX: The endpoint returns `chunks`, not `matches`
    return result.chunks || [];
  } catch (error: any) {
    console.error('❌ Pinecone error:', error.message);
    console.error('❌ Full error:', error);
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query } = req.body;
  
  console.log(`🔧 Debug: Testing Pinecone query with: "${query}"`);
  
  try {
    const chunks = await queryPinecone(query);
    
    return res.status(200).json({
      success: true,
      query,
      chunks,
      chunkCount: chunks.length,
      debug: {
        queryProvided: !!query,
        queryTrimmed: query?.trim(),
        baseUrl: process.env.BASE_URL || 'https://kovaldeepai-main.vercel.app'
      }
    });
  } catch (error: any) {
    console.error('❌ Debug test failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      query
    });
  }
}
