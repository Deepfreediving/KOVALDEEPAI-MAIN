import { Pinecone } from '@pinecone-database/pinecone';

// Initialize Pinecone client with environment variables
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,  // Pinecone API key from environment
  controllerHostUrl: process.env.PINECONE_HOST,  // Pinecone host URL
});

// Set up the Pinecone index
const index = pinecone.index(process.env.PINECONE_INDEX);  // 'koval-deep-ai'

// Export the index for use in other parts of the application
export default index;
