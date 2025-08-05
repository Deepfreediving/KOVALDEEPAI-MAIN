import type { NextApiRequest, NextApiResponse } from "next";
import { upsertData } from "./pineconeInit"; // ✅ Use local pineconeInit
import handleCors from "@/utils/cors";

interface VectorData {
  id: string;
  values: number[];
  metadata?: Record<string, string | number | boolean>;
}

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    processingTime: number;
    vectorCount: number;
    timestamp: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const startTime = Date.now();

  try {
    // ✅ CORS handling (matching your other APIs)
    if (await handleCors(req, res)) return;

    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Method Not Allowed",
        metadata: {
          processingTime: Date.now() - startTime,
          vectorCount: 0,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const data: VectorData[] = req.body;

    // ✅ Enhanced validation
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Request body must be a non-empty array of vectors",
        metadata: {
          processingTime: Date.now() - startTime,
          vectorCount: 0,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // ✅ Prevent timeouts with batch size limit
    if (data.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Too many vectors. Maximum 100 per request. Use batching for larger uploads.",
        metadata: {
          processingTime: Date.now() - startTime,
          vectorCount: data.length,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // ✅ Validate each vector with better error messages
    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      if (!item.id || typeof item.id !== "string" || item.id.trim() === "") {
        return res.status(400).json({
          success: false,
          error: `Vector at index ${i}: ID must be a non-empty string`,
        });
      }

      if (item.id.length > 512) {
        return res.status(400).json({
          success: false,
          error: `Vector at index ${i}: ID too long (max 512 characters)`,
        });
      }

      if (!Array.isArray(item.values) || item.values.length === 0) {
        return res.status(400).json({
          success: false,
          error: `Vector at index ${i}: values must be a non-empty array`,
        });
      }

      if (!item.values.every((v) => typeof v === "number" && isFinite(v))) {
        return res.status(400).json({
          success: false,
          error: `Vector at index ${i}: all values must be finite numbers`,
        });
      }

      // ✅ Validate metadata if present
      if (item.metadata) {
        for (const [key, value] of Object.entries(item.metadata)) {
          if (typeof key !== "string" || key.length > 100) {
            return res.status(400).json({
              success: false,
              error: `Vector at index ${i}: metadata key "${key}" invalid`,
            });
          }

          if (
            typeof value !== "string" &&
            typeof value !== "number" &&
            typeof value !== "boolean"
          ) {
            return res.status(400).json({
              success: false,
              error: `Vector at index ${i}: metadata value for "${key}" must be string, number, or boolean`,
            });
          }
        }
      }
    }

    console.log(`🚀 Upserting ${data.length} vectors to Pinecone`);

    // ✅ Add timeout for upsert operation
    const upsertPromise = upsertData(data);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Upsert timeout')), 25000)
    );

    const response = await Promise.race([upsertPromise, timeoutPromise]);

    const processingTime = Date.now() - startTime;
    console.log(`✅ Pinecone upsert completed in ${processingTime}ms`);

    return res.status(200).json({
      success: true,
      data: response,
      metadata: {
        processingTime,
        vectorCount: data.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Pinecone upsert error:", error);

    // ✅ Better error categorization
    let statusCode = 500;
    let errorMessage = "Failed to upsert vectors";

    if (
      error.message?.includes("Authentication") ||
      error.message?.includes("API key")
    ) {
      statusCode = 401;
      errorMessage = "Authentication failed";
    } else if (
      error.message?.includes("quota") ||
      error.message?.includes("rate limit")
    ) {
      statusCode = 429;
      errorMessage = "Rate limit exceeded";
    } else if (
      error.message?.includes("Invalid") ||
      error.message?.includes("validation")
    ) {
      statusCode = 400;
      errorMessage = error.message;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      metadata: {
        processingTime,
        vectorCount: Array.isArray(req.body) ? req.body.length : 0,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// ✅ Add timeout config
export const config = {
  api: {
    bodyParser: { sizeLimit: '5mb' },
    responseLimit: false,
    timeout: 30000
  }
};
