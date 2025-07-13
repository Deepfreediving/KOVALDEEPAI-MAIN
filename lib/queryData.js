import { Pinecone } from '@pinecone-database/pinecone';

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  controllerHostUrl: process.env.PINECONE_CONTROLLER_HOST,
});

// Set up the index
const index = pinecone.index(process.env.PINECONE_INDEX);  // Specify your Pinecone index

// Query function to search Pinecone index
export const queryData = async (queryVector) => {
  try {
    // Query Pinecone with the provided vector
    const queryResponse = await index.query({
      vector: queryVector, // The query vector to compare against
      top_k: 5,            // Number of similar results you want
      includeValues: true,  // Include the vector values in the response
      includeMetadata: true // Include metadata if necessary
    });

    // Return the query response (results from Pinecone)
    return queryResponse;
  } catch (error) {
    console.error('Pinecone query error:', error);
    throw error;
  }
};

