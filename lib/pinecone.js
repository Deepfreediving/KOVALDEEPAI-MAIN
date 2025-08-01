import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();

/**
 * ✅ Validate required environment variables early
 */
const { PINECONE_API_KEY, PINECONE_INDEX } = process.env;

if (!PINECONE_API_KEY) {
  throw new Error("❌ Missing Pinecone API key in environment variables.");
}
if (!PINECONE_INDEX) {
  throw new Error("❌ Missing Pinecone Index name in environment variables.");
}

/**
 * ✅ Initialize Pinecone client
 */
let pinecone;
try {
  pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
} catch (error) {
  console.error("❌ Failed to initialize Pinecone client:", error.message);
  throw error;
}

/**
 * ✅ Initialize the Pinecone index
 */
let index;
try {
  index = pinecone.index(PINECONE_INDEX);
} catch (error) {
  console.error("❌ Failed to initialize Pinecone index:", error.message);
  throw error;
}

/**
 * ✅ Upsert data to Pinecone
 * @param {Array<{id:string, values:number[], metadata?:object}>} data
 * @returns {Promise<object>}
 */
export const upsertData = async (data) => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Data must be a non-empty array of vectors.");
    }

    const validFormat = data.every(
      (item) =>
        typeof item.id === "string" &&
        Array.isArray(item.values) &&
        item.values.length > 0
    );

    if (!validFormat) {
      throw new Error("Each vector must have a valid 'id' (string) and 'values' (number[]).");
    }

    const response = await index.upsert({ vectors: data });

    if (!response || typeof response !== "object") {
      throw new Error("Pinecone upsert failed: no valid response returned.");
    }

    console.log(`✅ Successfully upserted ${data.length} vectors to Pinecone.`);
    return response;
  } catch (error) {
    console.error("❌ Pinecone upsert error:", error.message || JSON.stringify(error));
    throw error;
  }
};

/**
 * ✅ Query data from Pinecone
 * @param {number[]} query - Query vector for similarity search
 * @param {number} topK - Number of top results (default 5)
 * @returns {Promise<object>}
 */
export const queryData = async (query, topK = 5) => {
  try {
    if (!Array.isArray(query) || query.length === 0) {
      throw new Error("Query must be a non-empty array representing a vector.");
    }

    const response = await index.query({
      vector: query,
      topK,
      includeValues: true,
      includeMetadata: true,
    });

    if (!response || !Array.isArray(response.matches)) {
      throw new Error("Pinecone query failed: no matches found.");
    }

    console.log(`✅ Query returned ${response.matches.length} matches.`);
    return response;
  } catch (error) {
    console.error("❌ Pinecone query error:", error.message || JSON.stringify(error));
    throw error;
  }
};

/**
 * ✅ Export default index instance
 */
export default index;
