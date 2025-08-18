// 📂 pages/api/query.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { queryVectors } from "../../../lib/pineconeClient";
import OpenAI from "openai";

// Define or import PineconeRecord and RecordMetadata types
type RecordMetadata = { [key: string]: any }; // Adjust this type based on your metadata structure
type PineconeRecord<T> = {
  id: string;
  score?: number;
  metadata?: T; // Make metadata optional to match the Pinecone library type
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Move function to top level
  function handleCors(req: NextApiRequest, res: NextApiResponse): boolean {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(200).end();
      return true;
    }
    return false;
  }

  try {
    // ✅ Fix CORS handling - NOT async!
    if (handleCors(req, res)) return;

    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, error: "Method Not Allowed" });
    }

    const { query, topK = 5, filter } = req.body;

    if (!query || typeof query !== "string") {
      return res
        .status(400)
        .json({ success: false, error: "Query text is required." });
    }

    console.log(`🔍 Processing query: "${query}"`);

    // ✅ 1. Convert query text to embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query,
    });

    const queryVector = embeddingResponse.data[0].embedding;

    // ✅ 2. Query Pinecone index
    const rawMatches: PineconeRecord<RecordMetadata>[] = await queryVectors(
      queryVector,
      topK,
      filter,
    );
    const matches: Array<{
      id: string;
      score: number;
      metadata: RecordMetadata;
    }> = rawMatches.map((match) => ({
      id: match.id,
      score: match.score || 0, // Default score to 0 if missing
      metadata: match.metadata || {}, // Provide an empty object as default metadata
    }));

    if (matches.length === 0) {
      return res.status(200).json({
        success: true,
        matches: [],
        message: "No results found.",
      });
    }

    console.log(`✅ Query completed, found ${matches.length} matches`);

    return res.status(200).json({
      success: true,
      matches: matches.map((match) => ({
        id: match.id,
        score: match?.score || 0, // Ensure score exists or default to 0
        metadata: match.metadata,
      })),
      query,
      totalMatches: matches.length,
    });
  } catch (error: any) {
    console.error("❌ Error querying Pinecone:", error.message);
    return res.status(500).json({
      success: false,
      error: "Query failed",
      message: error.message,
    });
  }
}
