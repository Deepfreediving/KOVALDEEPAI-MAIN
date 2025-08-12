// pages/api/analyze/dive-logs.ts
// Dedicated endpoint for analyzing dive logs (cleaner than overloading chat)

import { NextApiRequest, NextApiResponse } from 'next';
import handleCors from '@/utils/handleCors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (handleCors(req, res)) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { diveLogs = [], diveLog, profile, userId, analysisType = 'single' } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Handle both single dive log and multiple dive logs
    const logsToAnalyze = diveLog ? [diveLog] : diveLogs;
    
    if (!logsToAnalyze || logsToAnalyze.length === 0) {
      return res.status(400).json({ error: 'diveLogs or diveLog required' });
    }

    console.log(`🎯 Analyzing ${logsToAnalyze.length} dive log(s) for ${userId}`);

    // Create analysis prompt based on type
    let analysisPrompt = '';
    
    if (analysisType === 'single' && logsToAnalyze.length === 1) {
      const log = logsToAnalyze[0];
      analysisPrompt = `
🏊‍♂️ **SINGLE DIVE LOG ANALYSIS**

Please analyze this freediving session and provide detailed coaching feedback:

**Dive Details:**
- Date: ${log.date || log.diveDate}
- Discipline: ${log.discipline} (${log.disciplineType || 'freediving'})
- Location: ${log.location}
- Target Depth: ${log.targetDepth}m
- Reached Depth: ${log.reachedDepth}m
- Depth Achievement: ${log.targetDepth && log.reachedDepth ? ((log.reachedDepth / log.targetDepth) * 100).toFixed(1) : '?'}%
- Exit Quality: ${log.exit}
- Total Time: ${log.totalDiveTime || 'Not recorded'}
- Surface Protocol: ${log.surfaceProtocol || 'Standard'}

**Performance:**
- Mouthfill Depth: ${log.mouthfillDepth || 0}m
- Issue Depth: ${log.issueDepth || 'None'}
- Squeeze: ${log.squeeze ? 'Yes' : 'No'}
- Notes: ${log.notes || 'No additional notes'}

**Coaching Analysis Required:**
1. **Performance Assessment**: How did this dive go overall?
2. **Technical Analysis**: What went well and what needs improvement?
3. **Safety Evaluation**: Any safety concerns or positive practices?
4. **Next Steps**: Specific recommendations for the next session
5. **Progression**: How does this fit into their development?

Please provide specific, actionable coaching feedback.
      `;
    } else {
      // Multiple logs analysis
      const logsSummary = logsToAnalyze.slice(0, 10).map((log: any, i: number) => 
        `${i + 1}. ${log.date || log.diveDate} | ${log.discipline} | ${log.reachedDepth}m/${log.targetDepth}m | ${log.exit} | ${log.notes || 'No notes'}`
      ).join('\n');

      analysisPrompt = `
🏊‍♂️ **MULTIPLE DIVE LOGS ANALYSIS**

Please analyze these ${logsToAnalyze.length} freediving sessions and provide comprehensive coaching feedback:

**Recent Dive Sessions:**
${logsSummary}

**Coaching Analysis Required:**
1. **Performance Trends**: Identify patterns and progression
2. **Technical Patterns**: Recurring strengths and areas for improvement
3. **Safety Assessment**: Overall safety practices and concerns
4. **Training Recommendations**: Specific next steps for improvement
5. **Goal Setting**: Suggested targets for upcoming sessions

Please provide comprehensive coaching insights based on these dive logs.
      `;
    }

    // Call OpenAI for analysis
    const baseUrl = process.env.BASE_URL || 'https://kovaldeepai-main.vercel.app';
    
    const chatResponse = await fetch(`${baseUrl}/api/openai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: analysisPrompt,
        userId,
        embedMode: false,
        profile: profile || { nickname: 'Member', source: 'dive-analysis' },
        diveLogs: logsToAnalyze
      })
    });

    if (!chatResponse.ok) {
      throw new Error(`OpenAI API failed with status ${chatResponse.status}`);
    }

    const analysis = await chatResponse.json();
    const analysisContent = analysis.assistantMessage?.content || analysis.analysis || analysis.answer;

    if (!analysisContent) {
      throw new Error('Empty analysis received from OpenAI');
    }

    console.log('✅ Dive log analysis completed successfully');

    // Return the analysis
    return res.status(200).json({
      success: true,
      analysis: analysisContent,
      metadata: {
        logsAnalyzed: logsToAnalyze.length,
        analysisType,
        analyzedAt: new Date().toISOString(),
        userId
      }
    });

  } catch (error) {
    console.error('❌ Dive log analysis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze dive logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
