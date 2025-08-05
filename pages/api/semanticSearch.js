import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import handleCors from '@/utils/handleCors'; // ✅ CHANGED from cors to handleCors

// ✅ Environment validation
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is required");
}

if (!PINECONE_API_KEY) {
  console.error("❌ PINECONE_API_KEY is required");
}

// ✅ Initialize clients with proper error handling
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY || '',
});

let pinecone;
let index;

try {
  if (PINECONE_API_KEY) {
    pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    index = pinecone.index(PINECONE_INDEX);
    console.log("✅ Pinecone initialized for semantic search");
  }
} catch (error) {
  console.error("❌ Pinecone initialization failed:", error);
}

// ✅ Enhanced semantic search with validation
export async function semanticSearch(query, options = {}) {
  if (!query || typeof query !== "string" || query.trim() === "") {
    throw new Error("Invalid query - must be a non-empty string");
  }

  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  if (!index) {
    throw new Error("Pinecone index not available");
  }

  const { topK = 5, includeMetadata = true, filter = null } = options;

  try {
    console.log(`🔍 Performing semantic search for: "${query.slice(0, 50)}..."`);
    
    // ✅ Create embedding with error handling
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query.trim(),
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      throw new Error("Invalid embedding generated");
    }

    // ✅ Query Pinecone with enhanced options
    const queryOptions = {
      vector: queryEmbedding,
      topK: Math.min(Math.max(topK, 1), 100), // Clamp between 1-100
      includeMetadata,
    };

    if (filter) {
      queryOptions.filter = filter;
    }

    const pineconeResponse = await index.query(queryOptions);
    
    const matches = pineconeResponse.matches || [];
    console.log(`✅ Found ${matches.length} matches for semantic search`);
    
    return matches;

  } catch (error) {
    console.error("❌ Semantic search error:", error);
    
    // ✅ Better error categorization
    if (error.message?.includes('API key')) {
      throw new Error("Authentication failed");
    } else if (error.message?.includes('quota') || error.message?.includes('rate')) {
      throw new Error("Rate limit exceeded");
    } else {
      throw new Error(`Semantic search failed: ${error.message}`);
    }
  }
}

// ✅ Enhanced API handler matching your project patterns
export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    // ✅ CORS handling (matching your other APIs)
    if (await handleCors(req, res)) return;

    // ✅ Method validation
    if (req.method !== "POST") {
      return res.status(405).json({ 
        error: "Method Not Allowed",
        message: "Only POST requests are allowed"
      });
    }

    // ✅ Input validation
    const { query, topK, filter } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        error: "Missing Query",
        message: "query field is required" 
      });
    }

    if (typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ 
        error: "Invalid Query",
        message: "query must be a non-empty string" 
      });
    }

    if (query.length > 8000) {
      return res.status(400).json({ 
        error: "Query Too Long",
        message: "query must be less than 8000 characters" 
      });
    }

    console.log(`🚀 Processing semantic search for: "${query.slice(0, 50)}..."`);

    // ✅ Perform semantic search
    const options = {};
    if (topK && typeof topK === 'number') options.topK = topK;
    if (filter && typeof filter === 'object') options.filter = filter;

    const results = await semanticSearch(query, options);
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Semantic search completed in ${processingTime}ms`);

    // ✅ Response format matching your other APIs
    return res.status(200).json({
      results,
      metadata: {
        query: query.slice(0, 100), // Truncated for logging
        resultCount: results.length,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Semantic search API error:", error);
    
    // ✅ Error response format matching your other APIs
    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (error.message?.includes("Authentication")) {
      statusCode = 401;
      errorMessage = "Authentication failed";
    } else if (error.message?.includes("Rate limit")) {
      statusCode = 429;
      errorMessage = "Rate limit exceeded";
    } else if (error.message?.includes("Invalid") || error.message?.includes("required")) {
      statusCode = 400;
      errorMessage = error.message;
    }

    return res.status(statusCode).json({ 
      error: "Semantic Search Failed",
      message: errorMessage,
      metadata: {
        processingTime,
        timestamp: new Date().toISOString()
      }
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    responseLimit: false
  }
};
