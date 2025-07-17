// Import Pinecone from the SDK
const { Pinecone } = require("@pinecone-database/pinecone");

// Ensure required environment variables are set
if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
  throw new Error(
    "Missing required Pinecone environment variables: PINECONE_API_KEY or PINECONE_INDEX",
  );
}

// Initialize Pinecone client with optional controller host URL
const client = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY, // API key from environment variables
  controllerHostUrl:
    process.env.PINECONE_HOST || "https://controller.us-east1-gcp.pinecone.io", // Default URL if not specified
});

// Set the index to use from the environment variable
const index = client.index(process.env.PINECONE_INDEX);

// Log the client and index to ensure they are initialized correctly (optional, for debugging)
console.log(
  "Pinecone client initialized with index:",
  process.env.PINECONE_INDEX,
);

// Export both the client and the index
module.exports = { client, index };
