// ✅ BATCH DIVE ANALYSIS - Analyze multiple dives for progression patterns
import OpenAI from "openai";
import { getServerClient } from '@/lib/supabase';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY || "" });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, timeRange = 30 } = req.body; // Default to last 30 days

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // ✅ Get dive logs from Supabase
    const supabase = getServerClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRange);

    const { data: diveLogs, error } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', cutoffDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching dive logs:', error);
      return res.status(500).json({ error: 'Failed to fetch dive logs' });
    }

    if (!diveLogs || diveLogs.length < 2) {
      return res.status(400).json({ 
        error: 'Insufficient data',
        message: 'Need at least 2 dives for pattern analysis'
      });
    }

    console.log(`📊 Analyzing ${diveLogs.length} dives for patterns`);

    // ✅ Prepare batch analysis data
    const analysisData = {
      totalDives: diveLogs.length,
      timeRange: `${timeRange} days`,
      disciplines: [...new Set(diveLogs.map(log => log.discipline))],
      depthProgression: diveLogs.map(log => ({
        date: log.date,
        target: log.target_depth,
        reached: log.reached_depth,
        discipline: log.discipline
      })),
      safetyIncidents: diveLogs.filter(log => 
        log.squeeze || 
        log.issue_comment?.toLowerCase().includes('squeeze') ||
        log.issue_comment?.toLowerCase().includes('blackout') ||
        log.issue_comment?.toLowerCase().includes('lmc')
      ),
      averageDepthByDiscipline: {},
      progressionTrends: []
    };

    // ✅ Calculate averages and trends
    analysisData.disciplines.forEach(discipline => {
      const disciplineDives = diveLogs.filter(log => log.discipline === discipline);
      const depths = disciplineDives.map(log => log.reached_depth || log.target_depth).filter(d => d);
      if (depths.length > 0) {
        analysisData.averageDepthByDiscipline[discipline] = {
          average: Math.round(depths.reduce((a, b) => a + b, 0) / depths.length),
          max: Math.max(...depths),
          count: depths.length,
          trend: depths.length > 1 ? (depths[depths.length - 1] - depths[0]) : 0
        };
      }
    });

    // ✅ AI Analysis with structured prompt
    const prompt = `Analyze this freediver's progression over ${timeRange} days using Daniel Koval's coaching methodology.

📊 DIVE DATA:
${JSON.stringify(analysisData, null, 2)}

🎯 ANALYSIS REQUIREMENTS:
Provide a comprehensive coaching analysis in the following JSON format:

{
  "overall_assessment": "General performance and safety evaluation",
  "progression_analysis": "Depth progression patterns and trends by discipline", 
  "safety_concerns": "Any safety issues, incidents, or risky patterns identified",
  "technique_patterns": "Recurring technique issues or improvements noted",
  "recommendations": "Specific coaching recommendations for next training phase",
  "goals_suggestions": "Suggested realistic goals for next 30 days",
  "daniel_methodology": "Specific quotes or references from Daniel's teaching relevant to this analysis"
}

Use Daniel Koval's E.N.C.L.O.S.E. framework and coaching principles. Focus on safety first, then sustainable progression.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0.1,
      top_p: 0.1,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are Daniel Koval's AI coaching assistant. Analyze dive progression patterns using his methodology. Always prioritize safety and provide structured, actionable coaching advice."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const analysisResult = JSON.parse(response.choices[0].message.content || '{}');

    // ✅ Save batch analysis to database
    try {
      const { error: saveError } = await supabase
        .from('batch_analyses')
        .insert({
          user_id: userId,
          analysis_type: 'progression_analysis',
          time_range_days: timeRange,
          dives_analyzed: diveLogs.length,
          analysis_data: analysisData,
          ai_analysis: analysisResult,
          created_at: new Date().toISOString()
        });

      if (saveError) {
        console.warn('⚠️ Failed to save batch analysis:', saveError);
      }
    } catch (saveError) {
      console.warn('⚠️ Failed to save batch analysis:', saveError);
    }

    return res.status(200).json({
      success: true,
      analysisData,
      aiAnalysis: analysisResult,
      metadata: {
        divesAnalyzed: diveLogs.length,
        timeRange: `${timeRange} days`,
        analysisDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Batch analysis error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed',
      details: error.message 
    });
  }
}

// ✅ ENHANCED: Advanced pattern detection with coaching methodology
function analyzeAdvancedPatterns(diveLogs) {
  const patterns = {
    depthProgression: analyzeDepthProgression(diveLogs),
    safetyPatterns: analyzeSafetyPatterns(diveLogs),
    techniquePatterns: analyzeTechniquePatterns(diveLogs),
    seasonalPatterns: analyzeSeasonalPatterns(diveLogs),
    recoveryPatterns: analyzeRecoveryPatterns(diveLogs),
    riskFactors: identifyRiskFactors(diveLogs)
  };
  
  return patterns;
}

function analyzeDepthProgression(diveLogs) {
  const depthData = diveLogs.map(log => ({
    date: log.date,
    depth: log.reached_depth || log.target_depth,
    discipline: log.discipline,
    success: !log.squeeze && !log.issue_comment
  }));
  
  // Calculate progression rate per discipline
  const disciplines = [...new Set(depthData.map(d => d.discipline))];
  const progressionRates = {};
  
  disciplines.forEach(discipline => {
    const disciplineData = depthData.filter(d => d.discipline === discipline);
    if (disciplineData.length > 1) {
      const firstDive = disciplineData[0];
      const lastDive = disciplineData[disciplineData.length - 1];
      const timeSpanDays = (new Date(lastDive.date) - new Date(firstDive.date)) / (1000 * 60 * 60 * 24);
      const depthGain = lastDive.depth - firstDive.depth;
      
      progressionRates[discipline] = {
        totalGain: depthGain,
        timeSpanDays: Math.max(1, timeSpanDays),
        ratePerWeek: (depthGain / Math.max(1, timeSpanDays)) * 7,
        successRate: disciplineData.filter(d => d.success).length / disciplineData.length,
        isProgressingTooFast: (depthGain / Math.max(1, timeSpanDays)) * 7 > 5 // >5m/week is aggressive
      };
    }
  });
  
  return { byDiscipline: progressionRates, overallTrend: calculateOverallTrend(depthData) };
}

function analyzeSafetyPatterns(diveLogs) {
  const safetyIssues = diveLogs.filter(log => 
    log.squeeze || 
    log.issue_comment || 
    (log.reached_depth < log.target_depth * 0.8) // Significant shortfall
  );
  
  const riskFactors = {
    squeezeFrequency: safetyIssues.filter(log => log.squeeze).length / diveLogs.length,
    depthShortfalls: safetyIssues.filter(log => log.reached_depth < log.target_depth * 0.8).length,
    consecutiveIssues: identifyConsecutiveIssues(diveLogs),
    depthJumps: identifyDangerousDepthJumps(diveLogs),
    recoveryQuality: analyzeRecoveryQuality(diveLogs)
  };
  
  return riskFactors;
}

function analyzeTechniquePatterns(diveLogs) {
  const techniqueIssues = {};
  
  diveLogs.forEach(log => {
    const notes = (log.notes || '').toLowerCase();
    const issues = log.issue_comment?.toLowerCase() || '';
    
    // Pattern detection in notes and issues
    if (notes.includes('equalization') || issues.includes('equalization')) {
      techniqueIssues.equalization = (techniqueIssues.equalization || 0) + 1;
    }
    if (notes.includes('mouthfill') || issues.includes('mouthfill')) {
      techniqueIssues.mouthfill = (techniqueIssues.mouthfill || 0) + 1;
    }
    if (notes.includes('narcosis') || issues.includes('narcosis')) {
      techniqueIssues.narcosis = (techniqueIssues.narcosis || 0) + 1;
    }
    if (notes.includes('contractions') || issues.includes('contractions')) {
      techniqueIssues.contractions = (techniqueIssues.contractions || 0) + 1;
    }
  });
  
  return techniqueIssues;
}

function generateTrainingPlan(patterns, timeframe = 30) {
  const plan = {
    focusAreas: [],
    weeklyTargets: [],
    safetyRecommendations: [],
    progressionRate: 'conservative'
  };
  
  // Analyze patterns and generate specific recommendations
  if (patterns.safetyPatterns.squeezeFrequency > 0.2) {
    plan.focusAreas.push('Equalization technique refinement');
    plan.safetyRecommendations.push('Reduce depth targets by 15% until squeeze rate < 10%');
  }
  
  if (patterns.depthProgression.byDiscipline) {
    Object.keys(patterns.depthProgression.byDiscipline).forEach(discipline => {
      const progression = patterns.depthProgression.byDiscipline[discipline];
      if (progression.isProgressingTooFast) {
        plan.safetyRecommendations.push(`${discipline}: Slow progression to max 3m/week`);
        plan.progressionRate = 'reduce';
      }
    });
  }
  
  return plan;
}

// Helper functions
function calculateOverallTrend(depthData) {
  if (depthData.length < 2) return 'insufficient_data';
  
  const sorted = depthData.sort((a, b) => new Date(a.date) - new Date(b.date));
  const recent = sorted.slice(-5); // Last 5 dives
  const earlier = sorted.slice(0, 5); // First 5 dives
  
  const recentAvg = recent.reduce((sum, dive) => sum + dive.depth, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, dive) => sum + dive.depth, 0) / earlier.length;
  
  return recentAvg > earlierAvg ? 'improving' : 'plateauing';
}

function identifyConsecutiveIssues(diveLogs) {
  let maxConsecutive = 0;
  let current = 0;
  
  diveLogs.forEach(log => {
    if (log.squeeze || log.issue_comment) {
      current++;
      maxConsecutive = Math.max(maxConsecutive, current);
    } else {
      current = 0;
    }
  });
  
  return maxConsecutive;
}

function identifyDangerousDepthJumps(diveLogs) {
  const jumps = [];
  const sorted = diveLogs.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  for (let i = 1; i < sorted.length; i++) {
    const prevDepth = sorted[i-1].reached_depth || sorted[i-1].target_depth;
    const currDepth = sorted[i].reached_depth || sorted[i].target_depth;
    const jump = currDepth - prevDepth;
    
    if (jump > 10) { // >10m jump is concerning
      jumps.push({
        from: prevDepth,
        to: currDepth,
        jump: jump,
        date: sorted[i].date,
        discipline: sorted[i].discipline
      });
    }
  }
  
  return jumps;
}

function analyzeRecoveryQuality(diveLogs) {
  const recoveryScores = diveLogs.map(log => {
    const surface = (log.surface_protocol || '').toLowerCase();
    if (surface.includes('good') || surface.includes('clean')) return 3;
    if (surface.includes('ok') || surface.includes('fine')) return 2;
    if (surface.includes('lmc') || surface.includes('samba')) return 1;
    return 2; // default neutral
  });
  
  return recoveryScores.reduce((sum, score) => sum + score, 0) / recoveryScores.length;
}

function identifyRiskFactors(diveLogs) {
  const factors = [];
  
  // Check for dangerous patterns
  const recentIssues = diveLogs.slice(-5).filter(log => log.squeeze || log.issue_comment).length;
  if (recentIssues >= 3) {
    factors.push('HIGH_RISK: 3+ issues in last 5 dives');
  }
  
  const depthJumps = identifyDangerousDepthJumps(diveLogs);
  if (depthJumps.length > 0) {
    factors.push(`TECHNIQUE_RISK: ${depthJumps.length} depth jumps >10m detected`);
  }
  
  return factors;
}
