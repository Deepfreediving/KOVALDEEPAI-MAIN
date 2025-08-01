import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
dotenv.config();

// ✅ Ensure all required environment variables are present
if (!process.env.PINECONE_API_KEY) {
  throw new Error("Missing Pinecone API key in environment variables.");
}
if (!process.env.PINECONE_INDEX) {
  throw new Error("Missing Pinecone Index name in environment variables.");
}

// ✅ Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// ✅ Initialize the Pinecone index
const index = pinecone.index(process.env.PINECONE_INDEX);

/**
 * ✅ Function to upsert data to Pinecone
 * @param {Array} data - Array of objects with { id, values, metadata? }
 */
export const upsertData = async (data) => {
  try {
    if (!Array.isArray(data) || !data.every((item) => item.id && item.values)) {
      throw new Error("Data must be an array of vectors with 'id' and 'values'.");
    }

    // Perform the upsert
    const upsertResponse = await index.upsert({
      vectors: data,
    });

    // Validate response
    if (!upsertResponse) {
      throw new Error("Pinecone upsert failed: no response returned.");
    }

    return upsertResponse;
  } catch (error) {
    console.error("Pinecone upsert error:", error.message || JSON.stringify(error));
    throw error;
  }
};

/**
 * ✅ Function to query data from Pinecone
 * @param {Array} query - Query vector for similarity search
 */
export const queryData = async (query) => {
  try {
    if (!query || !Array.isArray(query)) {
      throw new Error("Query must be an array representing a vector.");
    }

    const queryResponse = await index.query({
      vector: query,
      topK: 5,
      includeValues: true,
      includeMetadata: true,
    });

    if (!queryResponse || !queryResponse.matches) {
      throw new Error("Pinecone query failed: no matches found.");
    }

    return queryResponse;
  } catch (error) {
    console.error("Pinecone query error:", error.message || JSON.stringify(error));
    throw error;
  }
};

export default index;
