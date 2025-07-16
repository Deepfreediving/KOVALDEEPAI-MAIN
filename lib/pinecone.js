import { Pinecone } from '@pinecone-database/pinecone'; // Import the Pinecone SDK

// Initialize Pinecone client with the API key (no need to pass environment explicitly anymore)
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,  // Your Pinecone API Key from environment
});

// Initialize the Pinecone index using the environment variable for the index name
const index = pinecone.index(process.env.PINECONE_INDEX); // Using the correct index

// Function to upsert data to Pinecone
export const upsertData = async (data) => {
  try {
    // Ensure that 'data' is an array of vectors with necessary fields (id, values)
    if (!Array.isArray(data) || !data.every(item => item.id && item.values)) {
      throw new Error("Data must be an array of vectors with id and values.");
    }

    const upsertResponse = await index.upsert({
      vectors: data, // Data being inserted into Pinecone (ensure correct format)
    });
    return upsertResponse;
  } catch (error) {
    // Log the error for debugging
    console.error('Pinecone upsert error:', error.response?.data || error.message);
    throw error;  // Rethrow the error for further handling
  }
};

// Function to query data from Pinecone
export const queryData = async (query) => {
  try {
    // Ensure the query vector is provided
    if (!query || !Array.isArray(query)) {
      throw new Error("Query must be an array (vector format).");
    }

    const queryResponse = await index.query({
      vector: query,  // Vector for querying the Pinecone index
      topK: 5,        // Example: limit to top 5 results
      includeValues: true,  // Optional: Include vector values in the results
      includeMetadata: true,  // Optional: Include metadata in the results
    });
    return queryResponse;
  } catch (error) {
    // Log the error for debugging
    console.error('Pinecone query error:', error.response?.data || error.message);
    throw error;  // Rethrow the error for further handling
  }
};

// Export axios instance for any other uses (if needed)
export default index;
