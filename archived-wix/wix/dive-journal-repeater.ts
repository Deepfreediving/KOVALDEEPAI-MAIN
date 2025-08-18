// pages/api/wix/dive-journal-repeater.ts
// Integration with Wix UserMemory Repeater for Dive Journal Logs

import { NextApiRequest, NextApiResponse } from "next";
import handleCors from "@/utils/handleCors";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (handleCors(req, res)) return;

    if (req.method === "POST") {
      return await saveDiveJournalToRepeater(req, res);
    } else if (req.method === "GET") {
      return await getDiveJournalFromRepeater(req, res);
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("❌ Dive journal repeater error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function saveDiveJournalToRepeater(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const {
    userId,
    title,
    date,
    discipline,
    disciplineType,
    location,
    targetDepth,
    reachedDepth,
    mouthfillDepth,
    issueDepth,
    issueComment,
    exit,
    durationOrDistance,
    attemptType,
    notes,
    totalDiveTime,
    surfaceProtocol,
    squeeze,
    progressionScore,
    riskFactors,
    technicalNotes,
  } = req.body;

  console.log(`📊 Saving dive journal to UserMemory repeater for ${userId}`);

  try {
    // ✅ Call your Wix backend function for UserMemory repeater
    const wixResponse = await fetch(
      "https://www.deepfreediving.com/_functions/userMemory",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Wix-Source": "koval-ai-dive-journal",
          Accept: "application/json",
        },
        body: JSON.stringify({
          // ✅ UserMemory repeater fields - target specific dataset
          dataset: "UserMemory-@deepfreediving/kovaldeepai-app/Import1", // ✅ Exact dataset from Wix Editor
          collection: "diveJournalLogs",
          userId,
          title,
          date,
          discipline,
          disciplineType,
          location,
          targetDepth: Number(targetDepth),
          reachedDepth: Number(reachedDepth),
          mouthfillDepth: Number(mouthfillDepth) || 0,
          issueDepth: Number(issueDepth) || 0,
          issueComment: issueComment || "",
          exit,
          durationOrDistance,
          attemptType,
          notes,
          totalDiveTime: totalDiveTime || "",
          surfaceProtocol: surfaceProtocol || "",
          squeeze: Boolean(squeeze),
          progressionScore: Number(progressionScore) || 0,
          riskFactors: Array.isArray(riskFactors) ? riskFactors.join(",") : "",
          technicalNotes: technicalNotes || "",
          timestamp: new Date().toISOString(),
          analysisStatus: "pending",
          patternAnalysisNeeded: true,
          // ✅ Metadata for systematic AI analysis
          metadata: JSON.stringify({
            source: "koval-ai-widget",
            version: "2.0",
            analysisVersion: "1.0",
            createdAt: new Date().toISOString(),
          }),
        }),
      },
    );

    if (wixResponse.ok) {
      const wixData = await wixResponse.json();
      console.log("✅ Dive journal saved to UserMemory repeater successfully");

      return res.status(200).json({
        success: true,
        wixId: wixData.data?.[0]?._id,
        message: "Dive journal saved to repeater",
        data: wixData,
      });
    } else {
      const errorText = await wixResponse.text();
      console.error(
        "❌ Wix UserMemory repeater save failed:",
        wixResponse.status,
        errorText,
      );

      // ✅ Provide helpful error messages based on status
      let errorMessage = "Failed to save to Wix repeater";
      if (wixResponse.status === 404) {
        errorMessage =
          "Wix backend function not found - please deploy userMemory function";
      } else if (wixResponse.status === 403) {
        errorMessage =
          "Permission denied - check UserMemory dataset permissions";
      } else if (wixResponse.status >= 500) {
        errorMessage = "Wix backend error - check backend function logs";
      }

      return res.status(500).json({
        success: false,
        error: errorMessage,
        status: wixResponse.status,
        details: errorText.substring(0, 200),
        helpUrl: "See WIX-BACKEND-TEMPLATE.js for deployment instructions",
      });
    }
  } catch (error) {
    console.error("❌ UserMemory repeater save error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to connect to Wix backend",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function getDiveJournalFromRepeater(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const {
    userId,
    limit = 20,
    analysisStatus,
    needsPatternAnalysis,
  } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "userId required" });
  }

  console.log(
    `📋 Loading dive journal entries from UserMemory repeater for ${userId}`,
  );

  try {
    // ✅ Query your Wix UserMemory collection - specific dataset
    let queryUrl = `https://www.deepfreediving.com/_functions/userMemory?userId=${userId}&limit=${limit}&dataset=UserMemory-@deepfreediving/kovaldeepai-app/Import1`;

    if (analysisStatus) {
      queryUrl += `&analysisStatus=${analysisStatus}`;
    }

    if (needsPatternAnalysis === "true") {
      queryUrl += `&patternAnalysisNeeded=true`;
    }

    const wixResponse = await fetch(queryUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Wix-Source": "koval-ai-query",
      },
    });

    if (wixResponse.ok) {
      const wixData = await wixResponse.json();

      // ✅ Filter and format dive journal entries
      const diveJournalEntries =
        wixData.data?.filter(
          (item: any) => item.discipline && item.reachedDepth !== undefined,
        ) || [];

      console.log(
        `✅ Loaded ${diveJournalEntries.length} dive journal entries from repeater`,
      );

      return res.status(200).json({
        success: true,
        entries: diveJournalEntries,
        count: diveJournalEntries.length,
        source: "wix-usermemory-repeater",
      });
    } else {
      console.error(
        "❌ Wix UserMemory repeater query failed:",
        wixResponse.status,
      );
      return res.status(500).json({
        success: false,
        error: "Failed to query Wix repeater",
        entries: [],
      });
    }
  } catch (error) {
    console.error("❌ UserMemory repeater query error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to connect to Wix backend",
      entries: [],
    });
  }
}

// ✅ Individual dive log analysis endpoint
export async function analyzeSingleDiveLog(diveLogId: string, userId: string) {
  try {
    console.log(`🔍 Analyzing individual dive log ${diveLogId} for ${userId}`);

    // ✅ Get the specific dive log from UserMemory - specific dataset
    const response = await fetch(
      `https://www.deepfreediving.com/_functions/userMemory?itemId=${diveLogId}&dataset=UserMemory-@deepfreediving/kovaldeepai-app/Import1`,
      {
        headers: { Accept: "application/json" },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch dive log");
    }

    const { data } = await response.json();
    const diveLog = data[0];

    if (!diveLog) {
      throw new Error("Dive log not found");
    }

    // ✅ Send to OpenAI for individual analysis
    const analysisPrompt = `
Analyze this specific dive log for coaching insights:

📊 DIVE LOG DETAILS:
- Date: ${diveLog.date}
- Discipline: ${diveLog.discipline} (${diveLog.disciplineType})
- Location: ${diveLog.location}
- Target Depth: ${diveLog.targetDepth}m
- Reached Depth: ${diveLog.reachedDepth}m
- Mouthfill Depth: ${diveLog.mouthfillDepth}m
- Exit Quality: ${diveLog.exit}
- Issues: ${diveLog.issueComment || "None reported"}
- Notes: ${diveLog.notes}
- Progression Score: ${diveLog.progressionScore}/100
- Risk Factors: ${diveLog.riskFactors}

🎯 ANALYSIS REQUEST:
Provide specific coaching feedback for this dive including:
1. Performance assessment
2. Areas for improvement  
3. Next training recommendations
4. Safety considerations
    `;

    // ✅ Call OpenAI chat API for analysis
    // ✅ FIX: Always use production URL for internal API calls to avoid auth issues
    const baseUrl =
      process.env.BASE_URL || "https://kovaldeepai-main.vercel.app";

    const chatResponse = await fetch(`${baseUrl}/api/openai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: analysisPrompt,
        userId,
        embedMode: true,
        profile: { nickname: "Member" },
        diveLogs: [diveLog],
      }),
    });

    if (chatResponse.ok) {
      const analysis = await chatResponse.json();

      // ✅ Update the dive log with analysis - specific dataset
      await fetch("https://www.deepfreediving.com/_functions/userMemory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: diveLogId,
          dataset: "UserMemory-@deepfreediving/kovaldeepai-app/Import1",
          analysis: analysis.assistantMessage.content,
          analysisStatus: "completed",
          analyzedAt: new Date().toISOString(),
        }),
      });

      return {
        success: true,
        analysis: analysis.assistantMessage.content,
        diveLog,
      };
    }

    throw new Error("Failed to get AI analysis");
  } catch (error) {
    console.error("❌ Individual dive log analysis failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Analysis failed",
    };
  }
}
