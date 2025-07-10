import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pinecone } from '@pinecone-database/pinecone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const indexName = process.env.PINECONE_INDEX;
const environment = process.env.PINECONE_ENVIRONMENT;
const index = pinecone.index(indexName, environment);

async function queryIndex() {
  const queryVector = new Array(1024).fill(0.015); // Close to doc-1 and doc-2

  try {
    const result = await index.query({
      vector: queryVector,
      topK: 2,
      includeMetadata: true,
    });

    console.log('🔍 Query Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Query failed:', err);
  }
}

queryIndex();
