import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Lazy initialization to avoid cold start issues
let openaiClient: OpenAI | null = null;
let pineconeClient: Pinecone | null = null;
let pineconeIndex: any = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  }
  return openaiClient;
}

function getPineconeIndex() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });
  }
  if (!pineconeIndex) {
    pineconeIndex = pineconeClient.index(process.env.PINECONE_INDEX || 'koval-deep-ai');
  }
  return pineconeIndex;
}

// Get embedding for the user's query
async function getQueryEmbedding(query: string): Promise<number[]> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    return response.data[0].embedding;
  } catch (err: unknown) {
    console.error('❌ Error generating embedding:', err instanceof Error ? err.message : String(err));
    throw err;
  }
}

// Query Pinecone and return raw chunks
export async function queryPineconeForChunks(query: string): Promise<string[]> {
  if (!query?.trim()) return [];

  try {
    // Check if Pinecone is configured
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
      console.warn('⚠️ Pinecone not configured, skipping knowledge lookup');
      return [];
    }

    const embedding = await getQueryEmbedding(query);
    const index = getPineconeIndex();

    const result = await index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    // Return raw chunks
    if (result.matches && result.matches.length > 0) {
      return result.matches
        .map((match: any) => (typeof match?.metadata?.text === 'string' ? match.metadata.text : ''))
        .filter((text: string) => text.trim() !== '');
    } else {
      return [];
    }
  } catch (err: unknown) {
    console.error('❌ Error querying Pinecone for chunks:', err instanceof Error ? err.message : String(err));
    return [];
  }
}
