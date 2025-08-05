import type { NextApiRequest, NextApiResponse } from "next";
import { upsertData } from "./pineconeInit";
import handleCors from "@/utils/cors";

interface VectorData {
  id: string;
  values: number[];
  metadata?: Record<string, string | number | boolean>;
}

interface ApiResponse {
  success: boolean;
  data?: any; // ✅ Changed from unknown to any
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

    if (data.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Too many vectors. Maximum 100 per request.",
        metadata: {
          processingTime: Date.now() - startTime,
          vectorCount: data.length,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // ✅ Simplified validation
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      if (!item.id || typeof item.id !== "string") {
        return res.status(400).json({
          success: false,
          error: `Vector at index ${i}: ID must be a string`,
        });
      }

      if (!Array.isArray(item.values) || item.values.length === 0) {
        return res.status(400).json({
          success: false,
          error: `Vector at index ${i}: values must be a non-empty array`,
        });
      }
    }

    console.log(`🚀 Upserting ${data.length} vectors to Pinecone`);

    // ✅ Simplified - remove Promise.race timeout (causing issues)
    const response = await upsertData(data);

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
    
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to upsert vectors",
      metadata: {
        processingTime,
        vectorCount: 0,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '5mb' },
    responseLimit: false,
  }
};
