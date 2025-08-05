// 📂 pages/api/query.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { queryVectors } from "@/lib/pineconeService"; // ✅ Should internally handle PINECONE_HOST
import handleCors from "@/utils/cors";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const { query, topK = 5 } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, error: "Query text is required." });
    }

    // ✅ 1. Convert query text to embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small", // Use "text-embedding-3-large" for higher accuracy
      input: query,
    });

    const queryVector = embeddingResponse.data[0].embedding;

    // ✅ 2. Query Pinecone index (pineconeService must handle PINECONE_HOST)
    const matches = await queryVectors(queryVector, topK);

    if (!matches || matches.length === 0) {
      return res.status(200).json({ success: true, matches: [], message: "No results found." });
    }

    return res.status(200).json({ success: true, matches });
  } catch (error: any) {
    console.error("❌ Error querying Pinecone:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
