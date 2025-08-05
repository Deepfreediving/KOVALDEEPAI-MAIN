// 📂 pages/api/query.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { queryData } from "./pineconeInit";
import handleCors from "@/utils/handleCors";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // ✅ Handle CORS (not async)
    if (await handleCors(req, res)) return;

    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method Not Allowed" });
    }

    const { query, topK = 5 } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, error: "Query text is required." });
    }

    console.log(`🔍 Processing query: "${query}"`);

    // ✅ 1. Convert query text to embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryVector = embeddingResponse.data[0].embedding;

    // ✅ 2. Query Pinecone index
    const response = await queryData(queryVector, { topK });
    const matches = response.matches || [];

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
      matches,
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
