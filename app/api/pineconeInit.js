import { Pinecone } from '@pinecone-database/pinecone';

// If running locally, load environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();  // Only use dotenv in development mode
}

// Validate required environment variables
const { PINECONE_API_KEY, PINECONE_HOST, PINECONE_INDEX } = process.env;

if (!PINECONE_API_KEY) {
  throw new Error('Pinecone API key (PINECONE_API_KEY) is not configured.');
}

if (!PINECONE_HOST) {
  throw new Error('Pinecone host (PINECONE_HOST) is not configured.');
}

if (!PINECONE_INDEX) {
  throw new Error('Pinecone index (PINECONE_INDEX) is not configured.');
}

// Create and configure Pinecone client
const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
  controllerHostUrl: PINECONE_HOST,
});

// Set up the index you're working with
const index = pinecone.index(PINECONE_INDEX);

export default index;
