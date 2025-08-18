// pages/api/analyze/save-dive-log.ts - MIGRATED TO SUPABASE
import { NextApiRequest, NextApiResponse } from "next";
import handleCors from "@/utils/handleCors";

/**
 * @route   POST /api/analyze/save-dive-log
 * @desc    Save dive log (redirects to Supabase endpoint)
 * @access  Public
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // ✅ Handle CORS
    if (handleCors(req, res)) return;

    // ✅ Allow only POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ✅ Redirect to Supabase endpoint with all data
    console.log("🔄 Redirecting to Supabase save-dive-log endpoint...");
    
    // Forward the request to the Supabase endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const supabaseEndpoint = `${baseUrl}/api/supabase/save-dive-log`;
    
    const response = await fetch(supabaseEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Successfully saved via Supabase endpoint");
      return res.status(200).json(result);
    } else {
      console.error("❌ Supabase save failed:", result);
      return res.status(response.status).json(result);
    }

  } catch (error) {
    console.error("❌ Save dive log error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: "Failed to save dive log",
    });
  }
}
