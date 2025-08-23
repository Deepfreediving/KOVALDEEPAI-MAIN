import type { NextApiRequest, NextApiResponse } from "next";
import {
  analyzeDiveLogText,
  generateDiveReport,
} from "../../../utils/analyzeDiveLog";
import handleCors from "@/utils/handleCors"; // ✅ CHANGED from cors to handleCors
/**
 * @route   POST /api/analyze/analyze-dive-log
 * @desc    Analyze dive log text without saving it
 * @access  Public
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // ✅ Use handleCors
    if (handleCors(req, res)) return; // Early exit for OPTIONS

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { text = "" } = req.body;

    if (!text || typeof text !== "string") {
      return res
        .status(400)
        .json({ error: "Missing or invalid dive log text." });
    }

    const analysis = analyzeDiveLogText(text);
    const coachingReport = generateDiveReport(analysis);

    return res.status(200).json({
      success: true,
      analysis,
      coachingReport,
    });
  } catch (error: any) {
    console.error("❌ Analyze dive log error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
