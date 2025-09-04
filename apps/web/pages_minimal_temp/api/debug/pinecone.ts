// ===== 🔍 PINECONE DEBUG ENDPOINT =====
// Check Pinecone connectivity in production

import { NextApiRequest, NextApiResponse } from "next";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAI } from "openai";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const diagnostics: {
      timestamp: string;
      environment: string | undefined;
      vercelUrl: string;
      env: Record<string, string>;
      tests: Record<string, any>;
    } = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercelUrl: process.env.VERCEL_URL || 'not set',
      
      // Environment variables check (masked for security)
      env: {
        PINECONE_API_KEY: process.env.PINECONE_API_KEY ? `SET (${process.env.PINECONE_API_KEY.length} chars)` : 'MISSING',
        PINECONE_INDEX: process.env.PINECONE_INDEX || 'MISSING',
        PINECONE_HOST: process.env.PINECONE_HOST || 'MISSING',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? `SET (${process.env.OPENAI_API_KEY.length} chars)` : 'MISSING',
        BASE_URL: process.env.BASE_URL || 'MISSING'
      },
      
      tests: {}
    };

    // Test 1: Pinecone client initialization
    try {
      if (!process.env.PINECONE_API_KEY) {
        throw new Error('PINECONE_API_KEY not set');
      }
      
      const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      const index = pinecone.index(process.env.PINECONE_INDEX || 'koval-deep-ai');
      
      diagnostics.tests.pineconeInit = '✅ SUCCESS';
    } catch (error) {
      diagnostics.tests.pineconeInit = `❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Test 2: OpenAI client initialization
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not set');
      }
      
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      diagnostics.tests.openaiInit = '✅ SUCCESS';
    } catch (error) {
      diagnostics.tests.openaiInit = `❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Test 3: Try to generate embedding
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: "test query"
      });
      diagnostics.tests.embeddingGeneration = `✅ SUCCESS (${embedding.data[0].embedding.length} dimensions)`;
    } catch (error) {
      diagnostics.tests.embeddingGeneration = `❌ FAILED: ${error.message}`;
    }

    // Test 4: Try to query Pinecone
    try {
      const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
      const index = pinecone.index(process.env.PINECONE_INDEX || 'koval-deep-ai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: "freediving safety"
      });

      const result = await index.query({
        vector: embedding.data[0].embedding,
        topK: 3,
        includeMetadata: true,
      });

      diagnostics.tests.pineconeQuery = `✅ SUCCESS: Found ${result.matches?.length || 0} matches`;
      
      if (result.matches && result.matches.length > 0) {
        const firstMatch = result.matches[0];
        const textValue = firstMatch.metadata?.text;
        diagnostics.tests.sampleData = typeof textValue === 'string' 
          ? textValue.substring(0, 200) + "..." 
          : "No text metadata found";
        diagnostics.tests.scores = result.matches.map(m => m.score?.toFixed(4));
      }
    } catch (error) {
      diagnostics.tests.pineconeQuery = `❌ FAILED: ${error.message}`;
    }

    // Test 5: Base URL logic
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.BASE_URL || 'https://kovaldeepai-main.vercel.app';
    
    diagnostics.tests.baseUrlLogic = `Base URL would be: ${baseUrl}`;

    return res.status(200).json(diagnostics);

  } catch (error) {
    return res.status(500).json({ 
      error: 'Diagnostic failed', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
