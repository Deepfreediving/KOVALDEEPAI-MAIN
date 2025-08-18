import {
  Pinecone,
  type RecordMetadata,
  type PineconeRecord,
} from "@pinecone-database/pinecone";

// ✅ Load environment variables
const { PINECONE_API_KEY, PINECONE_INDEX, PINECONE_HOST, PINECONE_NAMESPACE } =
  process.env;

if (!PINECONE_API_KEY) throw new Error("❌ Missing Pinecone API key.");
if (!PINECONE_INDEX) throw new Error("❌ Missing Pinecone index name.");

// ✅ Singleton client
let pineconeClient: Pinecone = (global as any)._pineconeClient;
if (!pineconeClient) {
  pineconeClient = new Pinecone({
    apiKey: PINECONE_API_KEY,
    ...(PINECONE_HOST && { host: PINECONE_HOST }),
  });
  (global as any)._pineconeClient = pineconeClient;
}

const index = pineconeClient.index(PINECONE_INDEX);

export interface VectorData {
  id: string;
  values: number[];
  metadata?: Record<string, string | number | boolean>;
}

/**
 * 📝 Upsert vectors to Pinecone
 */
export async function upsertVectors(vectors: VectorData[]): Promise<any> {
  try {
    if (!Array.isArray(vectors) || vectors.length === 0) {
      throw new Error("Vectors must be a non-empty array.");
    }

    const formattedVectors: PineconeRecord<RecordMetadata>[] = vectors.map(
      (v) => ({
        id: v.id,
        values: v.values,
        metadata: v.metadata ?? {},
      }),
    );

    const response = await index.upsert(formattedVectors);
    console.log(`✅ Upserted ${vectors.length} vectors`);
    return response;
  } catch (error: any) {
    console.error("❌ Error in upsertVectors:", error.message || error);
    throw new Error("Failed to upsert vectors to Pinecone.");
  }
}

/**
 * 🔍 Query vectors from Pinecone
 */
export async function queryVectors(
  vector: number[],
  topK = 5,
  filter?: any,
): Promise<PineconeRecord<RecordMetadata>[]> {
  try {
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("Query vector must be a non-empty array of numbers.");
    }

    const response = await index.query({
      vector,
      topK,
      filter,
      includeMetadata: true,
      includeValues: true,
      ...(PINECONE_NAMESPACE ? { namespace: PINECONE_NAMESPACE } : {}),
    });

    console.log(
      `✅ Query successful. Matches found: ${response.matches?.length || 0}`,
    );
    return response.matches ?? [];
  } catch (error: any) {
    console.error("❌ Error in queryVectors:", error.message || error);
    throw new Error("Failed to query Pinecone.");
  }
}

/**
 * 🗑️ Delete vectors by IDs
 */
export async function deleteVectors(ids: string[]): Promise<any> {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("IDs must be a non-empty array of strings.");
    }

    // ✅ Casting to any because some SDK versions don't type `.delete`
    const response = await (index as any).delete({
      ids,
      namespace: PINECONE_NAMESPACE || undefined,
    });

    console.log(`🗑️ Delete request sent for ${ids.length} vector(s)`);
    return response;
  } catch (error: any) {
    console.error("❌ Error in deleteVectors:", error.message || error);
    throw new Error("Failed to delete vectors from Pinecone.");
  }
}

export { pineconeClient, index };
