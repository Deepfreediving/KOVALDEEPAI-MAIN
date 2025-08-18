// pages/api/analyze/delete-dive-log.ts - MIGRATED TO SUPABASE
import type { NextApiRequest, NextApiResponse } from "next";
import handleCors from "@/utils/handleCors";

interface DeleteDiveLogRequest {
  userId: string;
  logId: string;
  source?: string;
}

interface DeleteDiveLogResponse {
  success: boolean;
  message: string;
  deletedId?: string;
  error?: string;
}

/**
 * @route   DELETE /api/analyze/delete-dive-log
 * @desc    Delete dive log (redirects to Supabase endpoint)
 * @access  Public
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteDiveLogResponse>,
) {
  try {
    // ✅ Handle CORS
    if (handleCors(req, res)) return;

    if (req.method !== "DELETE") {
      return res.status(405).json({
        success: false,
        message: "Method not allowed",
        error: "Only DELETE requests are supported",
      });
    }

    const {
      userId,
      logId,
      source = "dive-journal",
    }: DeleteDiveLogRequest = req.body;

    console.log(`� Redirecting delete to Supabase endpoint:`, {
      userId,
      logId,
      source,
      timestamp: new Date().toISOString(),
    });

    // Validate required fields
    if (!userId || !logId) {
      console.error("❌ DELETE DIVE LOG: Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId and logId are required",
        error: "MISSING_FIELDS",
      });
    }

    // ✅ Forward the request to the Supabase endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const supabaseEndpoint = `${baseUrl}/api/supabase/delete-dive-log`;
    
    const response = await fetch(supabaseEndpoint, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, logId, source }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Successfully deleted via Supabase endpoint");
      return res.status(200).json(result);
    } else {
      console.error("❌ Supabase delete failed:", result);
      return res.status(response.status).json(result);
    }

  } catch (error) {
    console.error("❌ DELETE DIVE LOG: Unexpected error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete dive log",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
