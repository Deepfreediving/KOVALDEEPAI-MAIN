// lib/pineconeInit.js
import { Pinecone } from "@pinecone-database/pinecone";

const { PINECONE_API_KEY, PINECONE_INDEX, PINECONE_ENVIRONMENT } = process.env;

// ✅ Enhanced environment validation
if (!PINECONE_API_KEY) {
  console.error("❌ PINECONE_API_KEY is required");
  throw new Error("Missing Pinecone API key");
}

if (!PINECONE_INDEX) {
  console.error("❌ PINECONE_INDEX is required");
  throw new Error("Missing Pinecone index name");
}

// ✅ Enhanced client initialization with error handling
let pineconeClient;
let index;

try {
  // Use global instance to prevent multiple connections
  if (!globalThis.pineconeClient) {
    console.log("🔄 Initializing Pinecone client...");
    
    const config = { apiKey: PINECONE_API_KEY };
    if (PINECONE_ENVIRONMENT) {
      config.environment = PINECONE_ENVIRONMENT;
    }
    
    pineconeClient = new Pinecone(config);
    globalThis.pineconeClient = pineconeClient;
    console.log("✅ Pinecone client initialized");
  } else {
    pineconeClient = globalThis.pineconeClient;
    console.log("♻️ Using existing Pinecone client");
  }

  // Get index reference
  index = pineconeClient.index(PINECONE_INDEX);
  console.log(`✅ Connected to index: ${PINECONE_INDEX}`);

} catch (error) {
  console.error("❌ Pinecone initialization failed:", error);
  throw new Error(`Pinecone setup failed: ${error.message}`);
}

// ✅ Export functions (ONLY ONCE)
export async function queryData(vector, options = {}) {
  try {
    if (!index) {
      throw new Error("Pinecone index not initialized");
    }

    console.log(`🔍 Querying with vector length: ${vector.length}, options:`, options);
    
    const response = await index.query({
      vector,
      topK: options.topK || 5,
      filter: options.filter,
      includeMetadata: true,
      includeValues: false
    });

    console.log(`✅ Query successful, found ${response.matches?.length || 0} matches`);
    return response;

  } catch (error) {
    console.error("❌ Query failed:", error);
    throw new Error(`Pinecone query failed: ${error.message}`);
  }
}

export async function upsertData(vectors) {
  try {
    if (!index) {
      throw new Error("Pinecone index not initialized");
    }

    console.log(`📝 Upserting ${vectors.length} vectors`);
    
    const response = await index.upsert(vectors);
    
    console.log("✅ Upsert successful");
    return response;

  } catch (error) {
    console.error("❌ Upsert failed:", error);
    throw new Error(`Pinecone upsert failed: ${error.message}`);
  }
}

export async function deleteData(ids) {
  try {
    if (!index) {
      throw new Error("Pinecone index not initialized");
    }

    console.log(`🗑️ Deleting vectors with IDs: ${ids}`);
    
    const response = await index.delete1({ ids });
    
    console.log("✅ Delete successful");
    return response;

  } catch (error) {
    console.error("❌ Delete failed:", error);
    throw new Error(`Pinecone delete failed: ${error.message}`);
  }
}

// ✅ Export default
export { queryData, upsertData, deleteData };

// pages/api/query.js
import handleCors from '@/utils/handleCors';
import { queryData } from "./pineconeInit";

export default async function handler(req, res) {
  try {
    // ✅ Fix CORS handling
    if (handleCors(req, res)) return;
    
    if (req.method !== "POST") {
      return res.status(405).json({ 
        success: false, 
        error: "Method Not Allowed",
        message: "Only POST requests are allowed"
      });
    }

    // ✅ Accept both query string and vector directly
    const { query, queryVector, topK = 5, filter } = req.body;

    let finalVector = queryVector;

    // ✅ If query string provided, convert to vector
    if (query && !queryVector) {
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const embedding = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: query,
        });
        
        finalVector = embedding.data[0].embedding;
      } catch (embeddingError) {
        console.error('❌ Failed to create embedding:', embeddingError);
        return res.status(500).json({
          success: false,
          error: "Failed to create embedding for query"
        });
      }
    }

    // ✅ Validate vector
    if (!Array.isArray(finalVector) || finalVector.length === 0) {
      return res.status(400).json({
        success: false, 
        error: "Query vector is required and must be a non-empty array"
      });
    }

    console.log(`🔍 Querying Pinecone with topK=${topK}`);

    const options = { topK };
    if (filter) options.filter = filter;
    
    const response = await queryData(finalVector, options);
    const matches = response.matches || [];

    console.log(`✅ Query completed, found ${matches.length} matches`);

    return res.status(200).json({ 
      success: true, 
      matches,
      query: query || 'vector query',
      totalMatches: matches.length
    });

  } catch (error) {
    console.error("❌ Error querying Pinecone:", error.message);
    
    return res.status(500).json({ 
      success: false, 
      error: "Failed to query documents",
      message: error.message
    });
  }
}
