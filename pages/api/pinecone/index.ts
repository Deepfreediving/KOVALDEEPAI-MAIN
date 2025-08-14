import type { NextApiRequest, NextApiResponse } from "next";
import {
  upsertVectors,
  queryVectors,
  deleteVectors,
} from "@/lib/pineconeClient";
import handleCors from "@/utils/handleCors";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // ✅ Handle CORS
    if (await handleCors(req, res)) return;

    if (req.method === "POST") {
      const {
        vectors,
        action = "upsert",
        vector,
        topK = 5,
        filter,
        ids,
        query,
      } = req.body;

      switch (action) {
        case "upsert": {
          if (!vectors || !Array.isArray(vectors)) {
            return res
              .status(400)
              .json({ success: false, error: "vectors array is required" });
          }
          if (vectors.length === 0) {
            return res
              .status(400)
              .json({ success: false, error: "vectors array cannot be empty" });
          }
          if (vectors.length > 1000) {
            return res.status(400).json({
              success: false,
              error: "Too many vectors. Maximum 1000 per request",
            });
          }

          const response = await upsertVectors(vectors);
          return res
            .status(200)
            .json({ success: true, data: response, count: vectors.length });
        }

        case "query": {
          let queryVector = vector;

          // ✅ NEW: Auto-generate embedding from text query
          if (!queryVector && typeof query === "string" && query.trim()) {
            console.log(`🔍 Generating embedding for query: "${query}"`);
            const embedding = await openai.embeddings.create({
              model: "text-embedding-3-small",
              input: query,
            });
            queryVector = embedding.data[0].embedding;
            console.log(
              `✅ Generated embedding with ${queryVector.length} dimensions`,
            );
          }

          if (!queryVector || !Array.isArray(queryVector)) {
            return res.status(400).json({
              success: false,
              error: "query text or vector is required",
            });
          }

          const matches = await queryVectors(
            queryVector,
            Number(topK) || 5,
            filter,
          );
          return res.status(200).json({
            success: true,
            matches, // ✅ UPDATED: Return matches directly
            matchCount: matches.length || 0,
          });
        }

        case "delete": {
          if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({
              success: false,
              error: "ids array is required for deletion",
            });
          }

          const response = await deleteVectors(ids);
          return res
            .status(200)
            .json({ success: true, data: response, deleted: ids.length });
        }

        default:
          return res.status(400).json({
            success: false,
            error: "Invalid action. Use 'upsert', 'query', or 'delete'",
          });
      }
    }

    // ✅ GET endpoint: health check
    if (req.method === "GET") {
      return res.status(200).json({
        success: true,
        message: "Pinecone API is operational",
        timestamp: new Date().toISOString(),
        availableActions: ["upsert", "query", "delete"],
      });
    }

    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("❌ Pinecone API error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message || "Unknown error occurred",
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "10mb" },
    responseLimit: false,
    timeout: 30000,
  },
};
