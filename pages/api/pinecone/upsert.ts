import type { NextApiRequest, NextApiResponse } from "next";
import { upsertVectors, VectorData } from "@/lib/pineconeService";
import handleCors from "@/utils/cors";

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (await handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const data: VectorData[] = req.body;

    // ✅ Validate input array
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Request body must be a non-empty array of vectors.",
      });
    }

    // ✅ Validate each vector
    for (const item of data) {
      if (!item.id || typeof item.id !== "string") {
        return res.status(400).json({
          success: false,
          error: "Each vector must include a valid 'id' (string).",
        });
      }

      if (
        !Array.isArray(item.values) ||
        !item.values.every((v) => typeof v === "number")
      ) {
        return res.status(400).json({
          success: false,
          error: "Each vector must include 'values' as an array of numbers.",
        });
      }

      // ✅ Validate metadata
      if (item.metadata) {
        const invalidMeta = Object.values(item.metadata).some(
          (value) =>
            typeof value !== "string" &&
            typeof value !== "number" &&
            typeof value !== "boolean"
        );
        if (invalidMeta) {
          return res.status(400).json({
            success: false,
            error:
              "Metadata values must be of type string, number, or boolean only.",
          });
        }
      }
    }

    console.log("📌 Upserting vectors to Pinecone:", data.length, "items");

    const response = await upsertVectors(data);

    console.log("✅ Pinecone upsert successful");

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error("❌ Error during Pinecone upsert:", error.message || error);
    return res.status(500).json({
      success: false,
      error: `Failed to upsert data: ${error.message || "Unknown error"}`,
    });
  }
}
