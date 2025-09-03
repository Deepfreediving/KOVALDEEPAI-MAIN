/**
 * 🧪 TEST ENDPOINT: Optimized Pinecone Service
 * 
 * PURPOSE: Test the new optimized Pinecone service with various queries
 * USAGE: POST /api/test/pinecone-optimized with { query: "test query" }
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { queryPineconeOptimized, healthCheck } from '@/lib/pineconeService';
import handleCors from '@/utils/handleCors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    // Health check
    try {
      console.log('🔍 Running Pinecone health check...');
      const health = await healthCheck();
      return res.status(200).json({
        status: 'Health Check Complete',
        health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return res.status(500).json({
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, topK, threshold } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required and must be a string' });
  }

  try {
    console.log(`🧪 Testing optimized Pinecone with query: "${query}"`);
    
    const startTime = Date.now();
    const result = await queryPineconeOptimized(query, {
      topK: topK || 5,
      threshold: threshold || 0.5,
      includeMetadata: true,
    });
    const totalTime = Date.now() - startTime;

    console.log(`✅ Test completed in ${totalTime}ms`);
    console.log(`📊 Found ${result.chunks.length} relevant chunks`);

    return res.status(200).json({
      success: true,
      query,
      totalTime,
      serviceProcessingTime: result.processingTime,
      chunksFound: result.chunks.length,
      chunks: result.chunks,
      scores: result.scores,
      metadata: result.metadata,
      options: {
        topK: topK || 5,
        threshold: threshold || 0.5,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Optimized Pinecone test failed:', error);
    return res.status(500).json({
      error: 'Optimized Pinecone test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
