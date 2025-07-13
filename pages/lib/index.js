// Import Pinecone from the SDK
const { Pinecone } = require('@pinecone-database/pinecone');

// Initialize Pinecone client
const client = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,  // API key from environment variables
  controllerHostUrl: process.env.PINECONE_HOST,  // Optional: if needed
});

// Set the index to use
const index = client.index(process.env.PINECONE_INDEX);  // Replace 'your-index-name' with actual index

module.exports = index;
