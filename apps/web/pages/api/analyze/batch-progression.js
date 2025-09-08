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
