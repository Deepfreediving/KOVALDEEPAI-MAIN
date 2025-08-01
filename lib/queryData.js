import { Pinecone } from '@pinecone-database/pinecone';

/**
 * ✅ Validate required environment variables early
 */
const { PINECONE_API_KEY, PINECONE_CONTROLLER_HOST, PINECONE_INDEX } = process.env;

if (!PINECONE_API_KEY) {
  throw new Error('❌ Missing environment variable: PINECONE_API_KEY');
}
if (!PINECONE_CONTROLLER_HOST) {
  throw new Error('❌ Missing environment variable: PINECONE_CONTROLLER_HOST');
}
if (!PINECONE_INDEX) {
  throw new Error('❌ Missing environment variable: PINECONE_INDEX');
}

/**
 * ✅ Initialize Pinecone client
 */
let pinecone;
try {
  pinecone = new Pinecone({
    apiKey: PINECONE_API_KEY,
    controllerHostUrl: PINECONE_CONTROLLER_HOST,
  });
} catch (error) {
  console.error('❌ Failed to initialize Pinecone client:', error.message);
  throw error;
}

/**
 * ✅ Initialize Pinecone index
 */
let index;
try {
  index = pinecone.index(PINECONE_INDEX);
} catch (error) {
  console.error('❌ Failed to initialize Pinecone index:', error.message);
  throw error;
}

/**
 * ✅ Query data from Pinecone
 * @param {number[]} queryVector - Vector for similarity search
 * @param {number} topK - Number of results to return (default: 5)
 * @returns {Promise<object>} Query results
 */
export const queryData = async (queryVector, topK = 5) => {
  try {
    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      throw new Error('Query vector must be a non-empty array of numbers.');
    }

    console.log('🔍 Querying Pinecone index:', PINECONE_INDEX);
    console.log('📌 Query vector length:', queryVector.length);

    const queryResponse = await index.query({
      vector: queryVector,
      topK,
      includeValues: true,
      includeMetadata: true,
    });

    if (!queryResponse || !Array.isArray(queryResponse.matches)) {
      throw new Error('Pinecone query returned no valid matches.');
    }

    console.log(`✅ Query successful: ${queryResponse.matches.length} matches found.`);
    return queryResponse;
  } catch (error) {
    console.error('❌ Pinecone query error:', error.message || JSON.stringify(error));
    throw new Error(`Pinecone query failed: ${error.message || error}`);
  }
};

export default queryData;
