import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { upsertVectors } from '@/lib/pineconeClient';
import handleCors from '@/utils/handleCors';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await handleCors(req, res);
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { userId, memory } = req.body;

    if (!userId || !memory) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, memory' 
      });
    }

    // ✅ Create text for embedding
    const inputText = `
      Memory: ${memory.content || ""}
      Log Entry: ${memory.logEntry || ""}
      Discipline: ${memory.diveLog?.discipline || ""}
      Location: ${memory.diveLog?.location || ""}
      Target Depth: ${memory.diveLog?.targetDepth || 0}m
      Reached Depth: ${memory.diveLog?.reachedDepth || 0}m
      Notes: ${memory.diveLog?.notes || ""}
    `.trim();

    // ✅ Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: inputText
    });

    const vector = embeddingResponse.data[0].embedding;

    // ✅ Create unique ID
    const uniqueId = `memory-${userId}-${Date.now()}`;

    // ✅ Upsert to Pinecone
    await upsertVectors([{
      id: uniqueId,
      values: vector,
      metadata: {
        userId,
        type: 'user-memory',
        discipline: memory.diveLog?.discipline || '',
        location: memory.diveLog?.location || '',
        targetDepth: memory.diveLog?.targetDepth || 0,
        reachedDepth: memory.diveLog?.reachedDepth || 0,
        timestamp: memory.timestamp || new Date().toISOString(),
        source: 'wix-backend'
      }
    }]);

    return res.status(200).json({
      success: true,
      message: 'Memory synced successfully',
      vectorId: uniqueId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Memory sync error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to sync memory',
      details: error.message
    });
  }
}

export const config = {
  api: {
    bodyParser: { 
      sizeLimit: '1mb' 
    }
  }
};
