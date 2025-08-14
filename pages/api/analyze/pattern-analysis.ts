// pages/api/analyze/pattern-analysis.ts
// Systematic pattern analysis across multiple dive logs for creating the best AI freediving coach

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

    const {
      userId,
      analysisType = "comprehensive",
      timeRange = "30days",
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    console.log(
      `🔬 Starting systematic pattern analysis for ${userId} (${analysisType}, ${timeRange})`,
    );

    // ✅ Fetch dive logs from new DiveLogs collection structure
    let diveLogs = [];
    try {
      // Use canonical base URL for internal API calls
      const BASE_URL =
        process.env.NEXTAUTH_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "https://kovaldeepai-main.vercel.app";

      console.log(
        `📡 Fetching dive logs from DiveLogs collection for userId: ${userId}`,
      );

      const response = await fetch(`${BASE_URL}/api/wix/dive-logs-bridge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          limit: 100,
          includeAnalysis: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        diveLogs =
          data.diveLogs?.filter(
            (log: any) => log.discipline && log.reachedDepth !== undefined,
          ) || [];
        console.log(
          `✅ Fetched ${diveLogs.length} dive logs from DiveLogs collection`,
        );
      } else {
        console.warn(
          `⚠️ Dive logs bridge failed (${response.status}), trying fallback...`,
        );

        // Fallback to query DiveLogs collection directly
        const fallbackResponse = await fetch(
          `${BASE_URL}/api/wix/query-wix-data`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              collectionId: "DiveLogs",
              filter: {
                userId: { $eq: userId },
                dataType: { $eq: "dive_log" },
              },
              sort: [{ fieldName: "_createdDate", order: "desc" }],
              limit: 100,
            }),
          },
        );

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          diveLogs =
            fallbackData.items
              ?.map((item: any) => {
                try {
                  const parsedLogEntry = JSON.parse(item.logEntry || "{}");
                  return {
                    ...parsedLogEntry.dive,
                    _id: item._id,
                    userId: item.userId,
                    diveLogId: item.diveLogId,
                    date: item.diveDate,
                    time: item.diveTime,
                    photo: item.diveLogWatch,
                    analysis: parsedLogEntry.analysis,
                    metadata: parsedLogEntry.metadata,
                  };
                } catch (parseError) {
                  console.warn("⚠️ Could not parse dive log:", item._id);
                  return null;
                }
              })
              .filter(Boolean) || [];

          console.log(
            `📋 Fallback: Fetched ${diveLogs.length} dive logs from DiveLogs collection`,
          );
        }
      }
    } catch (error) {
      console.error("❌ Failed to fetch dive logs:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch dive logs from DiveLogs collection" });
    }

    if (diveLogs.length === 0) {
      return res.status(200).json({
        success: true,
        analysis: "No dive logs available for pattern analysis",
        patterns: [],
        recommendations: [],
      });
    }

    console.log(`📊 Analyzing patterns across ${diveLogs.length} dive logs`);

    // ✅ Filter by time range
    const cutoffDate = new Date();
    if (timeRange === "7days") cutoffDate.setDate(cutoffDate.getDate() - 7);
    else if (timeRange === "30days")
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    else if (timeRange === "90days")
      cutoffDate.setDate(cutoffDate.getDate() - 90);

    const filteredLogs = diveLogs.filter(
      (log: any) => new Date(log.date) >= cutoffDate,
    );

    // ✅ Generate comprehensive pattern analysis prompt
    const patternAnalysisPrompt = generatePatternAnalysisPrompt(
      filteredLogs,
      analysisType,
    );

    // ✅ Call OpenAI for systematic analysis
    try {
      // ✅ FIX: Always use production URL for internal API calls to avoid auth issues
      const baseUrl =
        process.env.BASE_URL || "https://kovaldeepai-main.vercel.app";

      console.log("🤖 Sending pattern analysis request to OpenAI...");

      const chatResponse = await fetch(`${baseUrl}/api/openai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: patternAnalysisPrompt,
          userId,
          embedMode: false, // Use full context for comprehensive analysis
          profile: { nickname: "Member", source: "pattern-analysis" },
          diveLogs: filteredLogs,
        }),
      });

      if (!chatResponse.ok) {
        throw new Error(`OpenAI API failed with status ${chatResponse.status}`);
      }

      const analysis = await chatResponse.json();
      const patternAnalysis = analysis.assistantMessage?.content;

      if (!patternAnalysis) {
        throw new Error("Empty pattern analysis received from OpenAI");
      }

      console.log("✅ Pattern analysis completed successfully");

      // ✅ Extract key insights and patterns
      const insights = extractPatternInsights(filteredLogs);

      // ✅ Save pattern analysis results to DiveLogs collection
      try {
        const analysisRecord = {
          userId: userId,
          diveLogId: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          logEntry: JSON.stringify({
            analysis: {
              type: "pattern-analysis",
              analysisType,
              timeRange,
              logsAnalyzed: filteredLogs.length,
              patternAnalysis,
              insights,
              version: "4.0",
            },
            metadata: {
              type: "pattern_analysis",
              source: "pattern-analysis-api",
              timestamp: new Date().toISOString(),
              analyzedAt: new Date().toISOString(),
            },
          }),
          diveDate: new Date(),
          diveTime: new Date().toLocaleTimeString(),
          diveLogWatch: null,
          dataType: "pattern_analysis",
        };

        const saveResponse = await fetch(`${BASE_URL}/api/wix/query-wix-data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "insert",
            collectionId: "DiveLogs",
            record: analysisRecord,
          }),
        });

        if (saveResponse.ok) {
          console.log("✅ Pattern analysis saved to DiveLogs collection");
        } else {
          console.warn(
            "⚠️ Failed to save pattern analysis to DiveLogs collection",
          );
        }
      } catch (saveError) {
        console.warn("⚠️ Failed to save pattern analysis:", saveError);
      }

      return res.status(200).json({
        success: true,
        analysis: patternAnalysis,
        insights,
        metadata: {
          logsAnalyzed: filteredLogs.length,
          timeRange,
          analysisType,
          analyzedAt: new Date().toISOString(),
        },
      });
    } catch (analysisError) {
      console.error("❌ Pattern analysis failed:", analysisError);
      return res.status(500).json({
        success: false,
        error: "Failed to perform pattern analysis",
        details:
          analysisError instanceof Error
            ? analysisError.message
            : "Unknown error",
      });
    }
  } catch (error) {
    console.error("❌ Pattern analysis error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

function generatePatternAnalysisPrompt(
  diveLogs: any[],
  analysisType: string,
): string {
  const logsSummary = diveLogs
    .map((log, index) => {
      return `${index + 1}. ${log.date} | ${log.discipline} | Target: ${log.targetDepth}m → Reached: ${log.reachedDepth}m | Exit: ${log.exit} | Issues: ${log.issueComment || "None"} | Notes: ${log.notes || "None"}`;
    })
    .join("\n");

  return `
🔬 SYSTEMATIC FREEDIVING PATTERN ANALYSIS

I need you to perform a comprehensive pattern analysis across ${diveLogs.length} dive logs to help create the best AI freediving coaching system on the planet.

📊 DIVE LOG DATA:
${logsSummary}

🎯 ANALYSIS OBJECTIVES:
${
  analysisType === "comprehensive"
    ? `
1. **Performance Trends**: Identify progression patterns, plateaus, and regressions
2. **Technical Patterns**: Recurring technical issues and improvements
3. **Safety Patterns**: Risk factors, safety trends, and concerning patterns
4. **Discipline Analysis**: Performance variations across different disciplines
5. **Depth Progression**: Systematic depth advancement patterns
6. **Issue Identification**: Common problems and their frequencies
7. **Success Factors**: What conditions lead to best performances
8. **Training Optimization**: Recommendations for training structure
`
    : `
1. **Key Performance Trends**
2. **Main Technical Issues**
3. **Safety Considerations**
4. **Next Training Focus**
`
}

🏆 COACHING SYSTEM REQUIREMENTS:
- Identify specific patterns that indicate readiness for progression
- Spot early warning signs of overtraining or safety concerns
- Recognize optimal training conditions and timing
- Create personalized progression recommendations
- Establish baseline metrics for future comparison

📈 PATTERN RECOGNITION FOCUS:
- Depth progression rates and plateaus
- Technical issue frequency and resolution
- Performance correlation with conditions (location, time, etc.)
- Exit quality trends and factors
- Issue depth patterns and risk factors

Please provide a systematic analysis that will help build the most intelligent freediving coaching AI system, focusing on actionable insights and clear pattern identification.
  `;
}

function extractPatternInsights(diveLogs: any[]): any {
  const insights = {
    totalDives: diveLogs.length,
    averageDepth: 0,
    maxDepth: 0,
    disciplines: {} as any,
    progressionTrend: "stable",
    riskFactors: [] as string[],
    successFactors: [] as string[],
    recentPerformance: "stable",
  };

  if (diveLogs.length === 0) return insights;

  // Calculate averages and totals
  const depths = diveLogs.map((log) => log.reachedDepth || 0);
  insights.averageDepth = Math.round(
    depths.reduce((a, b) => a + b, 0) / depths.length,
  );
  insights.maxDepth = Math.max(...depths);

  // Discipline breakdown
  diveLogs.forEach((log) => {
    const discipline = log.discipline || "Unknown";
    insights.disciplines[discipline] =
      (insights.disciplines[discipline] || 0) + 1;
  });

  // Progression trend (last 5 vs previous 5)
  if (diveLogs.length >= 10) {
    const recent = diveLogs.slice(0, 5).map((log) => log.reachedDepth || 0);
    const previous = diveLogs.slice(5, 10).map((log) => log.reachedDepth || 0);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

    if (recentAvg > previousAvg * 1.05) insights.progressionTrend = "improving";
    else if (recentAvg < previousAvg * 0.95)
      insights.progressionTrend = "declining";
  }

  // Risk factors
  diveLogs.forEach((log) => {
    if (log.squeeze) insights.riskFactors.push("squeeze-incidents");
    if (log.issueDepth > 0) insights.riskFactors.push("depth-issues");
    if (log.exit !== "Good") insights.riskFactors.push("exit-difficulties");
  });

  // Success factors
  const goodExits = diveLogs.filter((log) => log.exit === "Good").length;
  if (goodExits / diveLogs.length > 0.8) {
    insights.successFactors.push("consistent-exits");
  }

  return insights;
}
