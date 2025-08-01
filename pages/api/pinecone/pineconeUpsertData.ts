import type { NextApiRequest, NextApiResponse } from "next";
import { upsertData } from "@lib/pinecone"; // Import the Pinecone upsert helper
import handleCors from "@/utils/cors";
interface UpsertRequestBody {
  id: string;
  values: number[];
  metadata?: Record<string, unknown>;
}

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
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    // ✅ Extract data from request body
    const data: UpsertRequestBody[] = req.body;

    // ✅ Validate input
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Request body must be a non-empty array of vectors.",
      });
    }

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
    }

    console.log("📌 Upserting data to Pinecone:", JSON.stringify(data, null, 2));

    // ✅ Call Pinecone upsert helper
    const response = await upsertData(data);

    console.log("✅ Pinecone upsert response:", response);

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
