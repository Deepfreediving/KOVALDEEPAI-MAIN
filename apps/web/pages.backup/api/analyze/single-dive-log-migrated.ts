// pages/api/analyze/single-dive-log.ts - MIGRATED TO SUPABASE
// On-demand analysis of individual dive logs from Supabase
import { NextApiRequest, NextApiResponse } from "next";
import handleCors from "@/utils/handleCors";
import {
  analyzeDiveLogText,
  generateDiveReport,
} from "@/utils/analyzeDiveLog";

/**
 * @route   POST /api/analyze/single-dive-log
 * @desc    Analyze a single dive log using Supabase data
 * @access  Public
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (handleCors(req, res)) return;

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { userId, diveLogId, diveData } = req.body;

    console.log("🔍 Analyzing single dive log:", { userId, diveLogId });

    let diveLog: any = null;

    // ✅ If dive data is provided directly, use it
    if (diveData) {
      diveLog = diveData;
      console.log("📋 Using provided dive data");
    }
    // ✅ If only ID provided, fetch from Supabase
    else if (userId && diveLogId) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      
      try {
        const response = await fetch(
          `${baseUrl}/api/supabase/get-dive-logs?userId=${encodeURIComponent(userId)}`,
          {
            headers: { Accept: "application/json" },
          },
        );

        if (response.ok) {
          const { logs } = await response.json();
          diveLog = logs?.find((log: any) => log.id === diveLogId);
          console.log(`🌐 Found dive log in Supabase: ${!!diveLog}`);
        } else {
          console.error(`❌ Failed to fetch from Supabase: ${response.status}`);
        }
      } catch (fetchError) {
        console.error("❌ Error fetching dive log:", fetchError);
      }
    }

    if (!diveLog) {
      return res.status(404).json({
        success: false,
        error: "Dive log not found",
        details: "Could not find dive log with the provided ID",
      });
    }

    // ✅ Analyze the dive log
    console.log("🧠 Analyzing dive log data...");
    
    // Convert dive log to text format for analysis
    const diveText = formatDiveLogForAnalysis(diveLog);
    
    // Perform analysis
    const analysis = analyzeDiveLogText(diveText);
    const coachingReport = generateDiveReport(analysis);

    const result = {
      success: true,
      diveLogId: diveLog.id,
      userId: diveLog.user_id,
      analysis,
      coachingReport,
      processedAt: new Date().toISOString(),
    };

    console.log("✅ Single dive log analysis complete");
    return res.status(200).json(result);

  } catch (error) {
    console.error("❌ Single dive log analysis error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: "Failed to analyze dive log",
    });
  }
}

// Helper function to format dive log for analysis
function formatDiveLogForAnalysis(diveLog: any): string {
  const parts: string[] = [];
  
  if (diveLog.date) parts.push(`Date: ${diveLog.date}`);
  if (diveLog.discipline) parts.push(`Discipline: ${diveLog.discipline}`);
  if (diveLog.location) parts.push(`Location: ${diveLog.location}`);
  if (diveLog.target_depth) parts.push(`Target Depth: ${diveLog.target_depth}m`);
  if (diveLog.reached_depth) parts.push(`Reached Depth: ${diveLog.reached_depth}m`);
  if (diveLog.total_dive_time) parts.push(`Dive Time: ${diveLog.total_dive_time}`);
  if (diveLog.mouthfill_depth) parts.push(`Mouthfill Depth: ${diveLog.mouthfill_depth}m`);
  if (diveLog.issue_depth) parts.push(`Issue Depth: ${diveLog.issue_depth}m`);
  if (diveLog.exit) parts.push(`Exit: ${diveLog.exit}`);
  if (diveLog.surface_protocol) parts.push(`Surface Protocol: ${diveLog.surface_protocol}`);
  if (diveLog.notes) parts.push(`Notes: ${diveLog.notes}`);

  return parts.join('\n');
}
