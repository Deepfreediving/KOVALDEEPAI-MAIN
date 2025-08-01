import { Pinecone } from '@pinecone-database/pinecone';

if (
  !process.env.PINECONE_API_KEY ||
  !process.env.PINECONE_CONTROLLER_HOST ||
  !process.env.PINECONE_INDEX
) {
  throw new Error(
    'Missing necessary environment variables for Pinecone: PINECONE_API_KEY, PINECONE_CONTROLLER_HOST, or PINECONE_INDEX'
  );
}

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  controllerHostUrl: process.env.PINECONE_CONTROLLER_HOST,
});

const index = pinecone.index(process.env.PINECONE_INDEX);

export const queryData = async (queryVector) => {
  try {
    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      throw new Error('Query vector must be a non-empty array.');
    }

    console.log('Querying Pinecone with vector:', queryVector);

    const queryResponse = await index.query({
      vector: queryVector,
      topK: 5,
      includeValues: true,
      includeMetadata: true,
    });

    console.log('Pinecone query response:', queryResponse);
    return queryResponse;
  } catch (error) {
    console.error('Pinecone query error:', error.message || error);
    throw new Error(`Pinecone query error: ${error.message || error}`);
  }
};
