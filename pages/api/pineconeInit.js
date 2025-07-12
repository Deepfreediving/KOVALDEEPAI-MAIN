import { Pinecone } from '@pinecone-database/pinecone';

// Initialize Pinecone client with the API key only (environment is automatically picked up)
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,  // Pinecone API key from environment
});

// Set up the Pinecone index
const index = pinecone.index(process.env.PINECONE_INDEX);  // 'koval-deep-ai'

// Export the index for use in other parts of the application
export default index;
