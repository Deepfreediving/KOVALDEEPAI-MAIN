import { useState } from "react";

export default function AIAnalyzeButton({
  diveLog,
  userId,
  onAnalysisComplete,
  darkMode = false,
  setMessages,
  // size = "md", // Unused parameter, commenting out
  adminUserId, // optional Supabase/UUID to attribute analysis
  authToken, // optional bearer token to pass to API
  buttonText = "📊 Analyze",
  disabled = false,
}) {
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!diveLog) {
      console.error("Missing dive log information");
      return;
    }

    if (!onAnalysisComplete && !setMessages) {
      console.error("No analysis callback provided");
      return;
    }

    setAnalyzing(true);

    try {
      console.log("🤖 Starting AI analysis for dive log:", diveLog.id);

      // Show immediate feedback in chat
      if (setMessages) {
        const reached = diveLog.reachedDepth ?? diveLog.reached_depth;
        const target = diveLog.targetDepth ?? diveLog.target_depth;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `🤖 Analyzing your ${diveLog.discipline || "freediving"} dive to ${reached || target || "?"}m at ${diveLog.location || "unknown location"}...`,
          },
        ]);
      }

      // Prepare comprehensive dive data for analysis (send known fields only)
      const safeDiveLog = {
        id: diveLog.id,
        date: diveLog.date,
        discipline: diveLog.discipline,
        location: diveLog.location,
        targetDepth: diveLog.targetDepth ?? diveLog.target_depth,
        reachedDepth: diveLog.reachedDepth ?? diveLog.reached_depth,
        totalDiveTime: diveLog.totalDiveTime ?? diveLog.total_dive_time,
        mouthfillDepth: diveLog.mouthfillDepth ?? diveLog.mouthfill_depth,
        issueDepth: diveLog.issueDepth ?? diveLog.issue_depth,
        issueComment: diveLog.issueComment ?? diveLog.issue_comment,
        notes: diveLog.notes,
        // Include image-derived fields if present
        imageUrl: diveLog.imageUrl,
        extractedText: diveLog.extractedText,
        imageAnalysis: diveLog.imageAnalysis || diveLog.ai_analysis, // Support both field names
        extractedData: diveLog.extractedData, // Include structured data if available
      };

      const analysisPayload = {
        diveLogData: safeDiveLog,
        nickname: diveLog.nickname || userId || "User",
        analysisType: "detailed_coaching",
        ...(adminUserId ? { adminUserId } : {}),
      };

      console.log("📤 Sending analysis request:", analysisPayload);

      // Build headers
      const headers = { "Content-Type": "application/json" };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      // Call the analysis API
      const response = await fetch("/api/analyze/dive-log-openai", {
        method: "POST",
        headers,
        body: JSON.stringify(analysisPayload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Analysis completed:", result);

        if (result.success && result.analysis) {
          const savedInfo = result.supabaseDiveLogId
            ? `\n\n💾 Saved to your log (ID: ${result.supabaseDiveLogId}).`
            : "";
          const analysisMessage = `📊 Dive Analysis Complete\n\n${result.analysis}${savedInfo}`;

          // Show analysis in chat
          if (setMessages) {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: analysisMessage,
              },
            ]);
          }

          // Call completion callback
          if (onAnalysisComplete) {
            onAnalysisComplete(analysisMessage, result);
          }

          console.log("✅ Analysis successfully displayed");
        } else {
          throw new Error(result.error || "Analysis failed");
        }
      } else {
        const errorText = await response.text();
        throw new Error(`Analysis API failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error("❌ Analysis failed:", error);

      const errorMessage = `❌ Analysis Failed\n\n${error.message}. Please try again.`;

      if (setMessages) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: errorMessage,
          },
        ]);
      }

      if (onAnalysisComplete) {
        onAnalysisComplete(errorMessage, { error: true, message: error.message });
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <button
      onClick={handleAnalyze}
      disabled={disabled || analyzing || !diveLog}
      aria-busy={analyzing}
      className={`px-2 py-1 text-xs rounded font-medium transition-all ${
        analyzing
          ? "opacity-50 cursor-not-allowed bg-gray-400"
          : darkMode
            ? "bg-blue-600 text-white hover:bg-blue-500"
            : "bg-blue-500 text-white hover:bg-blue-600"
      }`}
      title="Analyze dive log with AI"
    >
      {analyzing ? "🤖..." : buttonText}
    </button>
  );
}
