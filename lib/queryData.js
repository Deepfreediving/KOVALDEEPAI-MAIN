import { Pinecone } from "@pinecone-database/pinecone";

// Ensure that environment variables are set correctly
if (
  !process.env.PINECONE_API_KEY ||
  !process.env.PINECONE_CONTROLLER_HOST ||
  !process.env.PINECONE_INDEX
) {
  throw new Error(
    "Missing necessary environment variables for Pinecone: PINECONE_API_KEY, PINECONE_CONTROLLER_HOST, or PINECONE_INDEX",
  );
}

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  controllerHostUrl: process.env.PINECONE_CONTROLLER_HOST,
});

// Set up the index using the environment variable for the index name
const index = pinecone.index(process.env.PINECONE_INDEX); // Specify your Pinecone index

// Query function to search Pinecone index
export const queryData = async (queryVector) => {
  try {
    // Ensure the queryVector is valid
    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      throw new Error("Query vector must be a non-empty array.");
    }

    // Query Pinecone with the provided vector
    console.log("Querying Pinecone with vector:", queryVector);
    const queryResponse = await index.query({
      vector: queryVector, // The query vector to compare against
      topK: 5, // Number of similar results you want
      includeValues: true, // Include the vector values in the response
      includeMetadata: true, // Include metadata if necessary
    });

    // Log and return the query response (results from Pinecone)
    console.log("Pinecone query response:", queryResponse);
    return queryResponse;
  } catch (error) {
    // Improved error handling and logging
    console.error("Pinecone query error:", error.message || error);
    throw new Error(`Pinecone query error: ${error.message || error}`);
  }
};
