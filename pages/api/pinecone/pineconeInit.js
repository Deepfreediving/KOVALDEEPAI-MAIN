// lib/pineconeClient.js
import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

// Load .env variables
dotenv.config();

const { PINECONE_API_KEY, PINECONE_INDEX } = process.env;

// ✅ Validate environment variables
if (!PINECONE_API_KEY) {
  throw new Error("❌ Missing Pinecone API key in environment variables.");
}
if (!PINECONE_INDEX) {
  throw new Error("❌ Missing Pinecone Index name in environment variables.");
}

// ✅ Create a singleton client (avoids multiple instances on hot reload)
const pineconeClient = global.pineconeClient || new Pinecone({ apiKey: PINECONE_API_KEY });
if (!global.pineconeClient) global.pineconeClient = pineconeClient;

// ✅ Initialize index
const index = pineconeClient.index(PINECONE_INDEX);

/**
 * 📥 Upsert data to Pinecone
 * @param {Array} vectors - Array of objects [{ id, values, metadata }]
 */
export async function upsertData(vectors = []) {
  try {
    if (!Array.isArray(vectors) || vectors.length === 0) {
      throw new Error("Data must be a non-empty array of vectors.");
    }

    const validFormat = vectors.every(
      (item) =>
        typeof item.id === "string" &&
        Array.isArray(item.values) &&
        item.values.every((v) => typeof v === "number")
    );

    if (!validFormat) {
      throw new Error("Each vector must have a valid 'id' and numeric 'values'.");
    }

    // ✅ Correct Pinecone SDK syntax
    const response = await index.upsert(vectors);
    console.log(`✅ Successfully upserted ${vectors.length} vectors.`);
    return response;
  } catch (error) {
    console.error("❌ Pinecone upsert error:", error);
    throw error;
  }
}

/**
 * 🔍 Query data from Pinecone
 * @param {Array} vector - Numeric vector
 * @param {number} topK - Number of results to return
 */
export async function queryData(vector = [], topK = 5) {
  try {
    if (!Array.isArray(vector) || !vector.length) {
      throw new Error("Query must be a non-empty numeric vector.");
    }

    const response = await index.query({
      vector,
      topK,
      includeValues: true,
      includeMetadata: true,
    });

    if (!response || !Array.isArray(response.matches)) {
      console.warn("⚠️ Pinecone query returned no matches.");
      return [];
    }

    console.log(`✅ Query returned ${response.matches.length} matches.`);
    return response.matches;
  } catch (error) {
    console.error("❌ Pinecone query error:", error);
    throw error;
  }
}

export { index, pineconeClient };
export default pineconeClient;
