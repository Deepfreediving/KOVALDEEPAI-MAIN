// pages/api/analyze/pattern-analysis.ts
// Systematic pattern analysis across multiple dive logs for creating the best AI freediving coach

import { NextApiRequest, NextApiResponse } from 'next';
import handleCors from '@/utils/handleCors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (handleCors(req, res)) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, analysisType = 'comprehensive', timeRange = '30days' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    console.log(`🔬 Starting systematic pattern analysis for ${userId} (${analysisType}, ${timeRange})`);

    // ✅ Fetch all dive logs from UserMemory repeater
    let diveLogs = [];
    try {
      const response = await fetch(`https://www.deepfreediving.com/_functions/userMemory?userId=${userId}&limit=100&patternAnalysisNeeded=true`);
      
      if (response.ok) {
        const { data } = await response.json();
        diveLogs = data?.filter((item: any) => 
          item.discipline && item.reachedDepth !== undefined
        ) || [];
      }
    } catch (error) {
      console.error('❌ Failed to fetch dive logs:', error);
      return res.status(500).json({ error: 'Failed to fetch dive logs from Wix' });
    }

    if (diveLogs.length === 0) {
      return res.status(200).json({
        success: true,
        analysis: 'No dive logs available for pattern analysis',
        patterns: [],
        recommendations: []
      });
    }

    console.log(`📊 Analyzing patterns across ${diveLogs.length} dive logs`);

    // ✅ Filter by time range
    const cutoffDate = new Date();
    if (timeRange === '7days') cutoffDate.setDate(cutoffDate.getDate() - 7);
    else if (timeRange === '30days') cutoffDate.setDate(cutoffDate.getDate() - 30);
    else if (timeRange === '90days') cutoffDate.setDate(cutoffDate.getDate() - 90);

    const filteredLogs = diveLogs.filter((log: any) => 
      new Date(log.date) >= cutoffDate
    );

    // ✅ Generate comprehensive pattern analysis prompt
    const patternAnalysisPrompt = generatePatternAnalysisPrompt(filteredLogs, analysisType);

    // ✅ Call OpenAI for systematic analysis
    try {
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';

      console.log('🤖 Sending pattern analysis request to OpenAI...');

      const chatResponse = await fetch(`${baseUrl}/api/openai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: patternAnalysisPrompt,
          userId,
          embedMode: false, // Use full context for comprehensive analysis
          profile: { nickname: 'Member', source: 'pattern-analysis' },
          diveLogs: filteredLogs
        })
      });

      if (!chatResponse.ok) {
        throw new Error(`OpenAI API failed with status ${chatResponse.status}`);
      }

      const analysis = await chatResponse.json();
      const patternAnalysis = analysis.assistantMessage?.content;

      if (!patternAnalysis) {
        throw new Error('Empty pattern analysis received from OpenAI');
      }

      console.log('✅ Pattern analysis completed successfully');

      // ✅ Extract key insights and patterns
      const insights = extractPatternInsights(filteredLogs);

      // ✅ Save pattern analysis results to UserMemory
      try {
        await fetch('https://www.deepfreediving.com/_functions/userMemory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            title: `Pattern Analysis - ${timeRange}`,
            patternAnalysis,
            analysisType,
            timeRange,
            logsAnalyzed: filteredLogs.length,
            insights: JSON.stringify(insights),
            metadata: JSON.stringify({
              type: 'pattern-analysis',
              version: '2.0',
              analyzedAt: new Date().toISOString()
            })
          })
        });
        console.log('✅ Pattern analysis saved to UserMemory');
      } catch (saveError) {
        console.warn('⚠️ Failed to save pattern analysis:', saveError);
      }

      return res.status(200).json({
        success: true,
        analysis: patternAnalysis,
        insights,
        metadata: {
          logsAnalyzed: filteredLogs.length,
          timeRange,
          analysisType,
          analyzedAt: new Date().toISOString()
        }
      });

    } catch (analysisError) {
      console.error('❌ Pattern analysis failed:', analysisError);
      return res.status(500).json({
        success: false,
        error: 'Failed to perform pattern analysis',
        details: analysisError instanceof Error ? analysisError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('❌ Pattern analysis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

function generatePatternAnalysisPrompt(diveLogs: any[], analysisType: string): string {
  const logsSummary = diveLogs.map((log, index) => {
    return `${index + 1}. ${log.date} | ${log.discipline} | Target: ${log.targetDepth}m → Reached: ${log.reachedDepth}m | Exit: ${log.exit} | Issues: ${log.issueComment || 'None'} | Notes: ${log.notes || 'None'}`;
  }).join('\n');

  return `
🔬 SYSTEMATIC FREEDIVING PATTERN ANALYSIS

I need you to perform a comprehensive pattern analysis across ${diveLogs.length} dive logs to help create the best AI freediving coaching system on the planet.

📊 DIVE LOG DATA:
${logsSummary}

🎯 ANALYSIS OBJECTIVES:
${analysisType === 'comprehensive' ? `
1. **Performance Trends**: Identify progression patterns, plateaus, and regressions
2. **Technical Patterns**: Recurring technical issues and improvements
3. **Safety Patterns**: Risk factors, safety trends, and concerning patterns
4. **Discipline Analysis**: Performance variations across different disciplines
5. **Depth Progression**: Systematic depth advancement patterns
6. **Issue Identification**: Common problems and their frequencies
7. **Success Factors**: What conditions lead to best performances
8. **Training Optimization**: Recommendations for training structure
` : `
1. **Key Performance Trends**
2. **Main Technical Issues**
3. **Safety Considerations**
4. **Next Training Focus**
`}

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
    progressionTrend: 'stable',
    riskFactors: [] as string[],
    successFactors: [] as string[],
    recentPerformance: 'stable'
  };

  if (diveLogs.length === 0) return insights;

  // Calculate averages and totals
  const depths = diveLogs.map(log => log.reachedDepth || 0);
  insights.averageDepth = Math.round(depths.reduce((a, b) => a + b, 0) / depths.length);
  insights.maxDepth = Math.max(...depths);

  // Discipline breakdown
  diveLogs.forEach(log => {
    const discipline = log.discipline || 'Unknown';
    insights.disciplines[discipline] = (insights.disciplines[discipline] || 0) + 1;
  });

  // Progression trend (last 5 vs previous 5)
  if (diveLogs.length >= 10) {
    const recent = diveLogs.slice(0, 5).map(log => log.reachedDepth || 0);
    const previous = diveLogs.slice(5, 10).map(log => log.reachedDepth || 0);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
    
    if (recentAvg > previousAvg * 1.05) insights.progressionTrend = 'improving';
    else if (recentAvg < previousAvg * 0.95) insights.progressionTrend = 'declining';
  }

  // Risk factors
  diveLogs.forEach(log => {
    if (log.squeeze) insights.riskFactors.push('squeeze-incidents');
    if (log.issueDepth > 0) insights.riskFactors.push('depth-issues');
    if (log.exit !== 'Good') insights.riskFactors.push('exit-difficulties');
  });

  // Success factors
  const goodExits = diveLogs.filter(log => log.exit === 'Good').length;
  if (goodExits / diveLogs.length > 0.8) {
    insights.successFactors.push('consistent-exits');
  }

  return insights;
}
