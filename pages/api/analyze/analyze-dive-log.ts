import type { NextApiRequest, NextApiResponse } from "next";
import { analyzeDiveLogText, generateDiveReport } from "../../../utils/analyzeDiveLog";

/**
 * @route   POST /api/analyze-dive-log
 * @desc    Analyze dive log text without saving it
 * @access  Public
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { text = "" } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid dive log text." });
    }

    const analysis = analyzeDiveLogText(text);
    const coachingReport = generateDiveReport(analysis);

    return res.status(200).json({
      success: true,
      analysis,
      coachingReport,
    });
  } catch (error: any) {
    console.error("❌ Error analyzing dive log:", error.message || error);
    return res.status(500).json({ error: "Failed to analyze dive log." });
  }
}
