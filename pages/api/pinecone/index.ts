import type { NextApiRequest, NextApiResponse } from "next";
import { upsertVectors, queryVectors, deleteVectors } from "@/lib/pineconeClient";
import handleCors from "@/utils/handleCors";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // ✅ Handle CORS
    if (await handleCors(req, res)) return;

    if (req.method === "POST") {
      const { vectors, action = "upsert", vector, topK = 5, filter, ids } = req.body;

      // ✅ Handle upsert
      if (action === "upsert") {
        if (!vectors || !Array.isArray(vectors)) {
          return res.status(400).json({ success: false, error: "vectors array is required" });
        }

        if (vectors.length === 0) {
          return res.status(400).json({ success: false, error: "vectors array cannot be empty" });
        }

        if (vectors.length > 1000) {
          return res.status(400).json({ success: false, error: "Too many vectors. Maximum 1000 per request" });
        }

        const response = await upsertVectors(vectors);
        return res.status(200).json({ success: true, data: response, count: vectors.length });
      }

      // ✅ Handle query
      if (action === "query") {
        if (!vector || !Array.isArray(vector)) {
          return res.status(400).json({ success: false, error: "query vector is required" });
        }

        const matches = await queryVectors(vector, Number(topK) || 5);
        return res.status(200).json({
          success: true,
          data: matches,
          matchCount: matches.length || 0,
        });
      }

      // ✅ Handle delete
      if (action === "delete") {
        if (!ids || !Array.isArray(ids)) {
          return res.status(400).json({ success: false, error: "ids array is required for deletion" });
        }

        const response = await deleteVectors(ids);
        return res.status(200).json({ success: true, data: response, deleted: ids.length });
      }

      return res.status(400).json({
        success: false,
        error: "Invalid action. Use 'upsert', 'query', or 'delete'",
      });
    }

    // ✅ GET endpoint: health check
    if (req.method === "GET") {
      return res.status(200).json({
        success: true,
        message: "Pinecone API is running",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(405).json({
      success: false,
      error: "Method Not Allowed. Use POST for operations, GET for health check",
    });
  } catch (error: any) {
    console.error("❌ Pinecone API error:", error);

    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (error.message?.includes("Missing") || error.message?.includes("required")) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message?.includes("API key") || error.message?.includes("unauthorized")) {
      statusCode = 401;
      errorMessage = "Authentication failed";
    } else if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
      statusCode = 429;
      errorMessage = "Rate limit exceeded";
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "5mb" },
    responseLimit: false,
  },
};
