// Import Pinecone from the SDK
const { Pinecone } = require('@pinecone-database/pinecone');

// Check if the required environment variables are set
if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
  throw new Error('Missing required Pinecone environment variables: PINECONE_API_KEY or PINECONE_INDEX');
}

// Initialize Pinecone client with optional controller host URL
const client = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,  // API key from environment variables
  controllerHostUrl: process.env.PINECONE_HOST || 'https://controller.us-east1-gcp.pinecone.io',  // Default URL if not specified
});

// Set the index to use
const index = client.index(process.env.PINECONE_INDEX);  // Using the actual index name

// Export the initialized index
module.exports = index;
