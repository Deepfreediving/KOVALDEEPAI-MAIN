// Import Pinecone from the SDK
const { Pinecone } = require("@pinecone-database/pinecone");

// ✅ Validate environment variables
const { PINECONE_API_KEY, PINECONE_INDEX, PINECONE_HOST } = process.env;

if (!PINECONE_API_KEY) {
  throw new Error("❌ Missing required environment variable: PINECONE_API_KEY");
}
if (!PINECONE_INDEX) {
  throw new Error("❌ Missing required environment variable: PINECONE_INDEX");
}

let client, index;

try {
  // ✅ Initialize Pinecone client
  client = new Pinecone({
    apiKey: PINECONE_API_KEY,
    ...(PINECONE_HOST && { controllerHostUrl: PINECONE_HOST }), // Only set if provided
  });

  // ✅ Initialize index
  index = client.index(PINECONE_INDEX);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `✅ Pinecone client initialized. Using index: ${PINECONE_INDEX}`,
    );
  }
} catch (error) {
  console.error(
    "❌ Failed to initialize Pinecone client or index:",
    error.message,
  );
  throw error;
}

module.exports = { client, index };
