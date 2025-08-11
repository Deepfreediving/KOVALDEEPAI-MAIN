import { useState } from 'react';
import { prepareDiveLogForAI } from '@/utils/diveLogFormatter';

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
      console.log('🤖 Starting AI analysis for dive log:', diveLog);
      
      // Prepare the dive log for AI analysis
      const analysisPrompt = prepareDiveLogForAI(diveLog);
      
      // Send to chat API for analysis
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: analysisPrompt,
          userId,
          profile: {},
          embedMode: false,
          diveLogs: [diveLog] // Include this specific dive log
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const analysisResult = data.assistantMessage?.content || data.answer || 'Analysis completed but no feedback received.';
      
      setAnalysis(analysisResult);
      setAnalyzed(true);
      
      console.log('✅ AI analysis completed successfully');
      
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
