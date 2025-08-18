import { useState } from "react";

export default function AIAnalyzeButton({
  diveLog,
  userId,
  onAnalysisComplete,
  darkMode = false,
  setMessages,
  // size = "md", // Unused parameter, commenting out
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
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `� **Analyzing Your Dive**\n\nAnalyzing your ${diveLog.discipline || "freediving"} dive to ${diveLog.reachedDepth || diveLog.targetDepth}m for detailed coaching feedback...`,
          },
        ]);
      }

      // Prepare comprehensive dive data for analysis
      const analysisPayload = {
        diveLog: {
          ...diveLog,
          // Include image data if available
          imageUrl: diveLog.imageUrl,
          extractedText: diveLog.extractedText,
          imageAnalysis: diveLog.imageAnalysis
        },
        nickname: diveLog.nickname || userId || 'Daniel Koval',
        analysisType: 'detailed_coaching'
      }

      console.log("📤 Sending analysis request:", analysisPayload);

      // Call the analysis API
      const response = await fetch("/api/analyze/dive-log-openai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(analysisPayload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Analysis completed:", result);

        if (result.success && result.analysis) {
          const analysisMessage = `📊 **Dive Analysis Complete**\n\n${result.analysis}`;
          
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
            onAnalysisComplete(analysisMessage);
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
      
      const errorMessage = `❌ **Analysis Failed**\n\nSorry, I couldn't analyze your dive log: ${error.message}. Please try again.`;
      
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
        onAnalysisComplete(errorMessage);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <button
      onClick={handleAnalyze}
      disabled={analyzing || !diveLog}
      className={`px-2 py-1 text-xs rounded font-medium transition-all ${
        analyzing
          ? "opacity-50 cursor-not-allowed bg-gray-400"
          : darkMode
            ? "bg-blue-600 text-white hover:bg-blue-500"
            : "bg-blue-500 text-white hover:bg-blue-600"
      }`}
      title="Analyze dive log with AI"
    >
      {analyzing ? "🤖..." : "📊 Analyze"}
    </button>
  );
}
