// pages/api/analyze/single-dive-log.ts
// On-demand analysis of individual dive logs from Wix repeater

import { NextApiRequest, NextApiResponse } from "next";
import handleCors from "@/utils/handleCors";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (handleCors(req, res)) return;

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { diveLogId, userId, diveLogData, diveLog: legacyDiveLog } = req.body;

    if (!diveLogId && !diveLogData && !legacyDiveLog) {
      return res
        .status(400)
        .json({ error: "diveLogId, diveLogData, or diveLog required" });
    }

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    console.log(`🔍 Analyzing individual dive log for ${userId}`);

    let diveLog = diveLogData || legacyDiveLog;

    // ✅ If only ID provided, try to fetch from local storage first, then Wix
    if (diveLogId && !diveLog) {
      try {
        // ✅ FIX: Always use production URL for internal API calls to avoid auth issues
        const baseUrl =
          process.env.BASE_URL || "https://kovaldeepai-main.vercel.app";

        console.log(
          `🗃️ Fetching dive log via: ${baseUrl}/api/analyze/get-dive-logs?userId=${userId}`,
        );

        const localResponse = await fetch(
          `${baseUrl}/api/analyze/get-dive-logs?userId=${userId}`,
        );
        if (localResponse.ok) {
          const localData = await localResponse.json();
          diveLog = localData.logs?.find((log: any) => log.id === diveLogId);
          console.log(`📁 Found dive log in local storage: ${!!diveLog}`);
        }

        // If not found locally, try Wix DiveLogs collection
        if (!diveLog) {
          const response = await fetch(
            `${baseUrl}/api/wix/dive-logs-bridge?userId=${userId}`,
            {
              headers: { Accept: "application/json" },
            },
          );

          if (response.ok) {
            const { diveLogs } = await response.json();
            diveLog = diveLogs?.find((log: any) => log.diveLogId === diveLogId);
            console.log(
              `🌐 Found dive log in DiveLogs collection: ${!!diveLog}`,
            );
          }
        }
      } catch (error) {
        console.error("❌ Failed to fetch dive log:", error);
      }
    }

    if (!diveLog) {
      return res.status(404).json({
        error: "Dive log not found",
        details:
          "Could not find dive log in local storage or DiveLogs collection",
        searchedId: diveLogId,
      });
    }

    // ✅ Handle both legacy and optimized data structures
    let analysisData = diveLog;

    // ✅ If optimized structure, extract dive data
    if (diveLog.dive && diveLog.analysis) {
      console.log("📊 Detected optimized data structure");
      analysisData = {
        id: diveLog.id,
        userId: diveLog.userId,
        timestamp: diveLog.timestamp,
        date: diveLog.dive.date,
        disciplineType: diveLog.dive.disciplineType,
        discipline: diveLog.dive.discipline,
        location: diveLog.dive.location,
        targetDepth: diveLog.dive.depths.target,
        reachedDepth: diveLog.dive.depths.reached,
        mouthfillDepth: diveLog.dive.depths.mouthfill,
        issueDepth: diveLog.dive.depths.issue,
        exit: diveLog.dive.performance.exit,
        durationOrDistance: diveLog.dive.performance.duration,
        totalDiveTime: diveLog.dive.performance.totalTime,
        attemptType: diveLog.dive.performance.attemptType,
        surfaceProtocol: diveLog.dive.performance.surfaceProtocol,
        squeeze: diveLog.dive.issues.squeeze,
        issueComment: diveLog.dive.issues.issueComment,
        notes: diveLog.dive.notes,
        // Include pre-calculated analysis
        progressionScore: diveLog.analysis.progressionScore,
        riskFactors: diveLog.analysis.riskFactors,
        technicalNotes: diveLog.analysis.technicalNotes,
        depthAchievement: diveLog.analysis.depthAchievement,
      };
    }

    // ✅ Create comprehensive analysis prompt with enhanced data
    const analysisPrompt = `
🏊‍♂️ INDIVIDUAL DIVE LOG ANALYSIS REQUEST

Please analyze this specific dive log and provide detailed coaching feedback:

📊 DIVE DETAILS:
- Date: ${analysisData.date}
- Discipline: ${analysisData.discipline} (${analysisData.disciplineType})
- Location: ${analysisData.location}
- Target Depth: ${analysisData.targetDepth}m
- Reached Depth: ${analysisData.reachedDepth}m
- Depth Achievement: ${analysisData.depthAchievement?.toFixed(1) || ((analysisData.reachedDepth / analysisData.targetDepth) * 100).toFixed(1)}%
- Mouthfill Depth: ${analysisData.mouthfillDepth || 0}m
- Exit Quality: ${analysisData.exit}
- Surface Protocol: ${analysisData.surfaceProtocol || "Not specified"}
- Total Time: ${analysisData.totalDiveTime || "Not recorded"}
- Attempt Type: ${analysisData.attemptType}

${analysisData.progressionScore ? `📈 PROGRESSION SCORE: ${analysisData.progressionScore}%` : ""}
${analysisData.riskFactors?.length ? `⚠️ RISK FACTORS: ${analysisData.riskFactors.join(", ")}` : ""}
${analysisData.technicalNotes ? `🔧 TECHNICAL NOTES: ${analysisData.technicalNotes}` : ""}

⚠️ ISSUES & CHALLENGES:
- Issue Depth: ${analysisData.issueDepth ? `${analysisData.issueDepth}m` : "None reported"}
- Issue Details: ${analysisData.issueComment || "None"}
- Squeeze Reported: ${analysisData.squeeze ? "Yes" : "No"}

📝 NOTES: ${analysisData.notes || "No additional notes"}

🎯 COACHING ANALYSIS NEEDED:
1. **Performance Assessment**: How did this dive go overall?
2. **Technical Analysis**: What went well and what needs improvement?
3. **Safety Evaluation**: Any safety concerns or positive safety practices?
4. **Next Steps**: Specific recommendations for the next training session
5. **Progression**: How does this fit into their overall development?

Please provide specific, actionable coaching feedback based on this dive data.
    `;

    // ✅ Call OpenAI for detailed analysis
    try {
      // ✅ FIX: Always use production URL for internal API calls to avoid auth issues
      const baseUrl =
        process.env.BASE_URL || "https://kovaldeepai-main.vercel.app";

      console.log(
        `🤖 Sending dive log to OpenAI via: ${baseUrl}/api/openai/chat`,
      );

      const chatResponse = await fetch(`${baseUrl}/api/openai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: analysisPrompt,
          userId,
          embedMode: true,
          profile: { nickname: "Member", source: "dive-log-analysis" },
          diveLogs: [diveLog],
        }),
      });

      if (!chatResponse.ok) {
        throw new Error(`OpenAI API failed with status ${chatResponse.status}`);
      }

      const analysis = await chatResponse.json();
      const aiAnalysis = analysis.assistantMessage?.content;

      if (!aiAnalysis) {
        throw new Error("Empty analysis received from OpenAI");
      }

      console.log("✅ AI analysis completed successfully");

      // ✅ Update the dive log in DiveLogs collection with analysis
      if (diveLogId) {
        try {
          const updateResponse = await fetch(
            `${baseUrl}/api/wix/query-wix-data`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "update",
                collection: "DiveLogs",
                filter: { diveLogId: diveLogId },
                data: {
                  analysis: aiAnalysis,
                  analysisStatus: "completed",
                  analyzedAt: new Date().toISOString(),
                  analysisVersion: "2.0",
                },
              }),
            },
          );

          if (updateResponse.ok) {
            console.log(
              "✅ Updated dive log with analysis in DiveLogs collection",
            );
          } else {
            console.warn("⚠️ Failed to update dive log in DiveLogs collection");
          }
        } catch (updateError) {
          console.warn(
            "⚠️ Failed to update dive log in DiveLogs:",
            updateError,
          );
          // Don't fail the whole request if update fails
        }
      }

      return res.status(200).json({
        success: true,
        analysis: aiAnalysis,
        diveLog: {
          id: diveLogId,
          date: diveLog.date,
          discipline: diveLog.discipline,
          location: diveLog.location,
          reachedDepth: diveLog.reachedDepth,
          targetDepth: diveLog.targetDepth,
        },
        metadata: {
          analyzedAt: new Date().toISOString(),
          analysisVersion: "2.0",
        },
      });
    } catch (analysisError) {
      console.error("❌ AI analysis failed:", analysisError);
      return res.status(500).json({
        success: false,
        error: "Failed to analyze dive log",
        details:
          analysisError instanceof Error
            ? analysisError.message
            : "Unknown error",
      });
    }
  } catch (error) {
    console.error("❌ Single dive log analysis error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
