import { useState } from 'react';

export default function AIAnalyzeButton({ 
  diveLog, 
  userId, 
  onAnalysisComplete, 
  darkMode = false 
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!diveLog || !userId) {
      setError('Missing dive log or user information');
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      console.log('🤖 Sending compressed dive log to OpenAI for analysis:', diveLog);
      
      // ✅ Create a focused coaching analysis prompt with the structured dive data
      const analysisPrompt = `
🏊‍♂️ DIVE LOG COACHING ANALYSIS REQUEST

Please provide detailed coaching feedback for this specific dive:

📊 DIVE DATA:
• Date: ${diveLog.date || 'Not specified'}
• Discipline: ${diveLog.discipline || 'Freediving'}
• Location: ${diveLog.location || 'Not specified'}
• Target Depth: ${diveLog.targetDepth || '?'}m
• Reached Depth: ${diveLog.reachedDepth || '?'}m
• Depth Achievement: ${diveLog.targetDepth && diveLog.reachedDepth ? ((diveLog.reachedDepth / diveLog.targetDepth) * 100).toFixed(1) : '?'}%
${diveLog.mouthfillDepth ? `• Mouthfill Depth: ${diveLog.mouthfillDepth}m` : ''}
${diveLog.exit ? `• Exit Quality: ${diveLog.exit}` : ''}
${diveLog.durationOrDistance ? `• Duration: ${diveLog.durationOrDistance}` : ''}
${diveLog.totalDiveTime ? `• Total Time: ${diveLog.totalDiveTime}` : ''}
${diveLog.attemptType ? `• Attempt Type: ${diveLog.attemptType}` : ''}
${diveLog.surfaceProtocol ? `• Surface Protocol: ${diveLog.surfaceProtocol}` : ''}

⚠️ ISSUES & CHALLENGES:
${diveLog.issueDepth ? `• Issue at: ${diveLog.issueDepth}m` : '• No issues reported'}
${diveLog.issueComment ? `• Issue details: ${diveLog.issueComment}` : ''}
${diveLog.squeeze ? '• Squeeze reported: Yes' : '• Squeeze reported: No'}

📝 NOTES: ${diveLog.notes || 'No additional notes'}

🎯 COACHING ANALYSIS NEEDED:
1. Performance assessment (how did this dive go?)
2. Technical analysis (what went well/needs improvement?)
3. Safety evaluation (any concerns or good practices?)
4. Next steps (specific recommendations for next session)
5. Progression advice (how this fits into overall development)

Please provide specific, actionable coaching feedback using Daniel Koval's freediving methodology.
      `;
      
      // ✅ Option 1: Use dedicated dive analysis endpoint (cleaner)
      const response = await fetch('/api/analyze/dive-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diveLog,
          userId,
          profile: { nickname: 'Member', source: 'dive-analysis' }
        })
      });

      if (!response.ok) {
        // ✅ Option 2: Fallback to direct OpenAI API
        console.warn(`⚠️ Dive analysis endpoint failed (${response.status}), using direct OpenAI...`);
        
        const fallbackResponse = await fetch('/api/openai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: analysisPrompt,
            userId,
            profile: { nickname: 'Member', source: 'dive-analysis' },
            embedMode: false,
            diveLogs: [diveLog]
          })
        });

        if (!fallbackResponse.ok) {
          throw new Error(`Analysis failed: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
        }

        const fallbackData = await fallbackResponse.json();
        const analysisResult = fallbackData.assistantMessage?.content || fallbackData.answer || fallbackData.content || 'Analysis completed but no feedback received.';
        
        setAnalysis(analysisResult);
        setAnalyzed(true);
        
        console.log('✅ AI dive analysis completed via fallback');
        
        if (onAnalysisComplete) {
          onAnalysisComplete(analysisResult, diveLog);
        }
        return;
      }

      const data = await response.json();
      const analysisResult = data.analysis || 'Analysis completed but no feedback received.';
      
      setAnalysis(analysisResult);
      setAnalyzed(true);
      
      console.log('✅ AI dive analysis completed successfully');
      
      // Notify parent component
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisResult, diveLog);
      }

    } catch (err) {
      console.error('❌ AI analysis error:', err);
      setError(err.message || 'Failed to analyze dive log');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReAnalyze = () => {
    setAnalyzed(false);
    setAnalysis('');
    setError('');
    handleAnalyze();
  };

  if (analyzed && analysis) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setAnalyzed(false)}
            className={`px-3 py-1 text-xs rounded font-medium ${
              darkMode 
                ? 'bg-green-600 text-white hover:bg-green-500' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            ✅ Analyzed
          </button>
          <button
            onClick={handleReAnalyze}
            disabled={analyzing}
            className={`px-3 py-1 text-xs rounded font-medium ${
              analyzing
                ? 'opacity-50 cursor-not-allowed bg-gray-400'
                : darkMode
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            🔄 Re-analyze
          </button>
        </div>
        
        {/* Analysis Results */}
        <div className={`p-3 rounded-lg text-sm ${
          darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="font-medium mb-2 text-blue-600 dark:text-blue-400">
            🤖 AI Coaching Analysis:
          </div>
          <div className="whitespace-pre-wrap">{analysis}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleAnalyze}
        disabled={analyzing || !diveLog}
        className={`px-3 py-1 text-xs rounded font-medium transition-all ${
          analyzing
            ? 'opacity-50 cursor-not-allowed bg-gray-400'
            : darkMode
            ? 'bg-blue-600 text-white hover:bg-blue-500'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {analyzing ? '🤖 Analyzing...' : '📊 AI Analyze'}
      </button>
      
      {error && (
        <div className="text-xs text-red-500 mt-1">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}