import { index } from "./pinecone";
import type { RecordMetadata, PineconeRecord } from "@pinecone-database/pinecone";

export interface VectorData {
  id: string;
  values: number[];
  metadata?: Record<string, string | number | boolean>; // ✅ strict type
}

/**
 * ✅ Upsert vectors to Pinecone
 */
export async function upsertVectors(vectors: VectorData[]) {
  if (!Array.isArray(vectors) || vectors.length === 0) {
    throw new Error("Vectors must be a non-empty array.");
  }

  const formattedVectors: PineconeRecord<RecordMetadata>[] = vectors.map((v) => ({
    id: v.id,
    values: v.values,
    metadata: v.metadata ?? {},
  }));

  return await index.upsert(formattedVectors); // ✅ no more 'vectors:' wrapper
}

/**
 * ✅ Query vectors from Pinecone
 */
export async function queryVectors(vector: number[], topK = 5) {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Query vector must be a non-empty array of numbers.");
  }

  const response = await index.query({
    vector,
    topK,
    includeMetadata: true,
    includeValues: true,
  });

  return response.matches ?? [];
}
