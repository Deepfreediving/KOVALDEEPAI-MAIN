// lib/pineconeInit.js
import { Pinecone } from "@pinecone-database/pinecone";

const { PINECONE_API_KEY, PINECONE_INDEX } = process.env;

if (!PINECONE_API_KEY) throw new Error("❌ Missing Pinecone API key.");
if (!PINECONE_INDEX) throw new Error("❌ Missing Pinecone index name.");

const pineconeClient =
  globalThis.pineconeClient || new Pinecone({ apiKey: PINECONE_API_KEY });
if (!globalThis.pineconeClient) globalThis.pineconeClient = pineconeClient;

const index = pineconeClient.index(PINECONE_INDEX);

export async function upsertData(vectors = []) {
  if (!Array.isArray(vectors) || !vectors.length) {
    throw new Error("Data must be a non-empty array of vectors.");
  }

  const formattedVectors = vectors.map((item) => ({
    id: item.id,
    values: item.values,
    metadata: item.metadata || {},
  }));

  const response = await index.upsert(formattedVectors);
  console.log(`✅ Successfully upserted ${vectors.length} vectors.`);
  return response;
}

export async function queryData(vector = [], topK = 5) {
  if (!Array.isArray(vector) || !vector.length) {
    throw new Error("Query must be a non-empty numeric vector.");
  }

  const response = await index.query({
    vector,
    topK,
    includeValues: true,
    includeMetadata: true,
  });

  return Array.isArray(response.matches) ? response.matches : [];
}

export { index, pineconeClient };
export default index;
