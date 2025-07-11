import { PineconeClient } from '@pinecone-database/pinecone'; // Ensure you have installed the Pinecone SDK

const client = new PineconeClient();

// Initialize Pinecone with your API key and other settings from environment variables
client.init({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_REGION,  // Add your environment, like "us-east1-gcp"
  index: process.env.PINECONE_INDEX,  // Add your index name
});

// Example function to interact with Pinecone
export const upsertData = async (data) => {
  try {
    const upsertResponse = await client.upsert({
      vectors: data, // Your data that you want to insert into Pinecone
    });
    return upsertResponse;
  } catch (error) {
    console.error('Pinecone upsert error:', error);
    throw error;
  }
};

// Example function to query Pinecone
export const queryData = async (query) => {
  try {
    const queryResponse = await client.query({
      vector: query, // Query vector for similarity search
    });
    return queryResponse;
  } catch (error) {
    console.error('Pinecone query error:', error);
    throw error;
  }
};
