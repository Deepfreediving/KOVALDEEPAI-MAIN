import { useState } from 'react';

export default function AIAnalyzeButton({ 
  diveLog, 
  userId, 
  onAnalysisComplete, 
  darkMode = false,
  size = 'md'
}) {
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!diveLog || !userId) {
      console.error('Missing dive log or user information');
      return;
    }

    if (!onAnalysisComplete) {
      console.error('No onAnalysisComplete callback provided');
      return;
    }

    setAnalyzing(true);

    try {
      console.log('🤖 Sending dive log to AI for analysis via chatbox...');
      
      // ✅ Create analysis request message for chatbox
      const analysisPrompt = `🏊‍♂️ **DIVE LOG ANALYSIS REQUEST**

Please provide detailed coaching feedback for this dive:

📊 **DIVE DATA:**
• Date: ${diveLog.date || 'Not specified'}
• Discipline: ${diveLog.discipline || 'Freediving'}  
• Location: ${diveLog.location || 'Not specified'}
• Target: ${diveLog.targetDepth || '?'}m → Reached: ${diveLog.reachedDepth || '?'}m
${diveLog.mouthfillDepth ? `• Mouthfill: ${diveLog.mouthfillDepth}m` : ''}
${diveLog.exit ? `• Exit: ${diveLog.exit}` : ''}
${diveLog.totalDiveTime ? `• Duration: ${diveLog.totalDiveTime}` : ''}
${diveLog.attemptType ? `• Type: ${diveLog.attemptType}` : ''}

⚠️ **ISSUES:** ${diveLog.issueDepth ? `Issue at ${diveLog.issueDepth}m` : 'None reported'}
${diveLog.issueComment ? `• ${diveLog.issueComment}` : ''}
${diveLog.squeeze ? '• Squeeze reported' : ''}

📝 **NOTES:** ${diveLog.notes || 'None'}

🎯 **ANALYSIS NEEDED:**
1. Performance assessment  
2. Technical feedback
3. Safety evaluation
4. Next session recommendations
5. Progression advice

Please provide specific coaching using Daniel Koval's freediving methodology.`;

      // ✅ Send analysis directly to chatbox
      onAnalysisComplete(analysisPrompt);
      
      console.log('✅ Analysis request sent to chatbox successfully');
    } catch (error) {
      console.error('❌ Analysis request failed:', error);
      onAnalysisComplete(`❌ Failed to analyze dive log: ${error.message}`);
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
          ? 'opacity-50 cursor-not-allowed bg-gray-400'
          : darkMode
          ? 'bg-blue-600 text-white hover:bg-blue-500'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      }`}
      title="Send dive log analysis to AI chatbox"
    >
      {analyzing ? '🤖...' : '📊 AI'}
    </button>
  );
}
