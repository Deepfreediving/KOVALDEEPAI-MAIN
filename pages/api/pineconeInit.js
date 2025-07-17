import { Pinecone } from "@pinecone-database/pinecone";

// Ensure necessary environment variables are set
if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
  throw new Error(
    "Missing required Pinecone environment variables: PINECONE_API_KEY or PINECONE_INDEX",
  );
}

// Initialize Pinecone client with the API key
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY, // Pinecone API key from environment
});

// Set up the Pinecone index using the environment variable
const index = pinecone.index(process.env.PINECONE_INDEX); // 'koval-deep-ai' or whatever index name is provided

// Export the index for use in other parts of the application
export default index;
