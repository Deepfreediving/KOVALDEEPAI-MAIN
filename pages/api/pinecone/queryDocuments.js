import handleCors from '@/utils/handleCors';
import { queryData } from "./pineconeInit";

export default async function handler(req, res) {
  try {
    if (handleCors(req, res)) return;
    
    if (req.method !== "POST") {
      return res.status(405).json({ 
        success: false, 
        error: "Method Not Allowed"
      });
    }

    const { query, queryVector, topK = 5, filter } = req.body;
    let finalVector = queryVector;

    // ✅ If text query provided, convert to vector
    if (query && !queryVector) {
      try {
        const baseUrl = req.headers.host?.includes('localhost') 
          ? 'http://localhost:3000' 
          : `https://${req.headers.host}`;
          
        const response = await fetch(`${baseUrl}/api/openai/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: query })
        });

        if (!response.ok) {
          throw new Error('Failed to create embedding');
        }

        const embeddingResult = await response.json();
        finalVector = embeddingResult.embedding;
      } catch (embeddingError) {
        console.error('❌ Embedding error:', embeddingError);
        return res.status(500).json({
          success: false,
          error: "Failed to create embedding"
        });
      }
    }

    if (!Array.isArray(finalVector) || finalVector.length === 0) {
      return res.status(400).json({
        success: false, 
        error: "Query vector or text query is required"
      });
    }

    console.log(`🔍 Querying Pinecone with topK=${topK}`);
    
    const response = await queryData(finalVector, { topK, filter });
    const matches = response.matches || [];

    return res.status(200).json({ 
      success: true, 
      matches,
      query: query || 'vector query',
      totalMatches: matches.length
    });

  } catch (error) {
    console.error("❌ Pinecone query error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Query failed",
      message: error.message
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '2mb' },
    responseLimit: false,
    timeout: 30000
  }
};
