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

// ✅ ONLY EXPORT FUNCTIONS (NO DUPLICATES, NO API HANDLER)
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
