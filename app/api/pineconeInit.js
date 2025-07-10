import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

// Initialize dotenv to load environment variables
dotenv.config();

// Create and configure Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  controllerHostUrl: process.env.PINECONE_HOST,  // Correct property to set the host
  fetchApi: undefined, // Optional: Set your fetch API if needed (or leave undefined)
  additionalHeaders: {},  // Optional: Set any additional headers if needed
});

// Set up the index you are working with
const index = pinecone.index('koval-deep-ai'); // Ensure this is the correct index name

export default index;
