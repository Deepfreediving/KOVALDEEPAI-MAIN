import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Show what URLs the chat endpoint would use
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.BASE_URL || 'https://kovaldeepai-main.vercel.app';

    const pineconeUrl = `${baseUrl}/api/pinecone/pineconequery-gpt`;
    
    console.log('🔍 Diagnostic Info:');
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`VERCEL_URL: ${process.env.VERCEL_URL || 'not set'}`);
    console.log(`BASE_URL: ${process.env.BASE_URL || 'not set'}`);
    console.log(`Constructed baseUrl: ${baseUrl}`);
    console.log(`Pinecone URL: ${pineconeUrl}`);

    // Test the Pinecone endpoint from server-side
    const testResponse = await fetch(pineconeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "4 rules of direct supervision",
        returnChunks: true,
      }),
    });

    const result = await testResponse.json();

    res.status(200).json({
      diagnostic: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_URL: process.env.VERCEL_URL || 'not set',
        BASE_URL: process.env.BASE_URL || 'not set',
        constructedBaseUrl: baseUrl,
        pineconeUrl,
        testResponse: {
          status: testResponse.status,
          ok: testResponse.ok,
          chunksReturned: result.chunks?.length || 0,
        }
      }
    });

  } catch (error: any) {
    console.error('Diagnostic error:', error);
    res.status(500).json({ 
      error: error.message,
      diagnostic: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_URL: process.env.VERCEL_URL || 'not set',
        BASE_URL: process.env.BASE_URL || 'not set',
      }
    });
  }
}
