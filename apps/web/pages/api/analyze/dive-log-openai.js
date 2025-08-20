// Simple OpenAI-powered dive log analysis
import OpenAI from 'openai';
import handleCors from '@/utils/handleCors';
import { getServerSupabaseClient } from '@/lib/supabaseServerClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Enhanced function to compute or extract descent/ascent speeds
function computeOrExtractSpeeds(maxDepthM, totalSeconds, bottomSeconds = 0, timeToMaxDepthSeconds, analysis = '') {
  // First try to extract from AI analysis if available
  const extractedMetrics = extractMetricsFromAnalysis(analysis);
  if (extractedMetrics.descent_seconds && extractedMetrics.ascent_seconds) {
    console.log('✅ Using AI-extracted timing data');
    return {
      descent_seconds: extractedMetrics.descent_seconds,
      ascent_seconds: extractedMetrics.ascent_seconds,
      descent_speed_mps: Number((maxDepthM / extractedMetrics.descent_seconds).toFixed(3)),
      ascent_speed_mps: Number((maxDepthM / extractedMetrics.ascent_seconds).toFixed(3)),
      source: 'ai_extracted'
    };
  }

  // Fallback: compute from available data
  const descent = timeToMaxDepthSeconds ?? Math.max(1, Math.floor((totalSeconds - bottomSeconds) / 2));
  const ascent = Math.max(1, totalSeconds - bottomSeconds - descent);
  
  return {
    descent_seconds: descent,
    ascent_seconds: ascent,
    descent_speed_mps: Number((maxDepthM / descent).toFixed(3)),
    ascent_speed_mps: Number((maxDepthM / ascent).toFixed(3)),
    source: 'computed'
  };
}

// ✅ NEW: Extract metrics from AI analysis text
function extractMetricsFromAnalysis(analysis) {
  const metrics = {};
  
  // Look for descent time pattern
  const descentMatch = analysis.match(/descent time:?\s*(\d+)\s*seconds?/i);
  if (descentMatch) metrics.descent_seconds = parseInt(descentMatch[1]);
  
  // Look for ascent time pattern  
  const ascentMatch = analysis.match(/ascent time:?\s*(\d+)\s*seconds?/i);
  if (ascentMatch) metrics.ascent_seconds = parseInt(ascentMatch[1]);
  
  // Look for bottom time pattern
  const bottomMatch = analysis.match(/bottom time:?\s*(\d+)\s*seconds?/i);
  if (bottomMatch) metrics.bottom_seconds = parseInt(bottomMatch[1]);
  
  // Look for speed patterns
  const descentSpeedMatch = analysis.match(/descent speed:?\s*([\d.]+)\s*m\/s/i);
  if (descentSpeedMatch) metrics.descent_speed = parseFloat(descentSpeedMatch[1]);
  
  const ascentSpeedMatch = analysis.match(/ascent speed:?\s*([\d.]+)\s*m\/s/i);
  if (ascentSpeedMatch) metrics.ascent_speed = parseFloat(ascentSpeedMatch[1]);
  
  console.log('📊 Extracted metrics from AI analysis:', metrics);
  return metrics;
}

// ✅ NEW: Function to save analysis to Supabase
async function saveAnalysisToSupabase(userId, diveLogData, analysis) {
  try {
    const supabase = getServerSupabaseClient();
    
    // Create deterministic UUID for consistency
    const crypto = require('crypto');
    let final_user_id;
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    if (isUUID) {
      final_user_id = userId
    } else {
      // Create a deterministic UUID from the user identifier
      const hash = crypto.createHash('md5').update(userId).digest('hex');
      final_user_id = [
        hash.substr(0, 8),
        hash.substr(8, 4), 
        hash.substr(12, 4),
        hash.substr(16, 4),
        hash.substr(20, 12)
      ].join('-');
    }

    // Parse dive data for computed fields
    const maxDepth = parseFloat(diveLogData.reachedDepth || diveLogData.reached_depth || 0);
    const totalTimeStr = diveLogData.totalDiveTime || diveLogData.total_dive_time || '';
    
    // Parse time (format: "3:12" or "192")
    let totalSeconds = 0;
    if (totalTimeStr.includes(':')) {
      const [minutes, seconds] = totalTimeStr.split(':').map(Number);
      totalSeconds = (minutes * 60) + seconds;
    } else {
      totalSeconds = parseInt(totalTimeStr) || 0;
    }

    // Compute speeds if we have valid data
    let computedSpeeds = {};
    if (maxDepth > 0 && totalSeconds > 0) {
      // Try to extract time to max depth from analysis or dive data
      let timeToMaxDepth = null;
      if (analysis.includes('minute mark')) {
        timeToMaxDepth = 60; // 1 minute
      } else if (analysis.includes('seconds to reach')) {
        const match = analysis.match(/(\d+)\s*seconds to reach/);
        if (match) timeToMaxDepth = parseInt(match[1]);
      }
      
      computedSpeeds = computeOrExtractSpeeds(maxDepth, totalSeconds, 0, timeToMaxDepth, analysis);
    }

    // Create summary from analysis
    const aiSummary = analysis.split('\n').slice(0, 3).join(' ').substring(0, 500);

    // Prepare dive log data for Supabase
    const diveLogForSupabase = {
      user_id: final_user_id,
      date: diveLogData.date || new Date().toISOString().split('T')[0],
      discipline: diveLogData.discipline || 'Unknown',
      location: diveLogData.location || 'Unknown',
      target_depth: parseFloat(diveLogData.targetDepth || diveLogData.target_depth || 0),
      reached_depth: maxDepth,
      total_time_seconds: totalSeconds,
      mouthfill_depth: parseFloat(diveLogData.mouthfillDepth || diveLogData.mouthfill_depth || 0),
      issue_depth: parseFloat(diveLogData.issueDepth || diveLogData.issue_depth || 0),
      issue_comment: diveLogData.issueComment || diveLogData.issue_comment || null,
      notes: diveLogData.notes || null,
      ai_analysis: analysis,
      ai_summary: aiSummary,
      ...computedSpeeds, // Add computed speeds
      analyzed_at: new Date().toISOString(),
    };

    // Insert or update dive log
    const { data, error } = await supabase
      .from('dive_logs')
      .upsert(diveLogForSupabase, { 
        onConflict: 'user_id,date,discipline,reached_depth',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase save error:', error);
      return null;
    }

    console.log('✅ Dive analysis saved to Supabase:', data.id);
    return data;
    
  } catch (error) {
    console.error('❌ Error saving to Supabase:', error);
    return null;
  }
}

export default async function handler(req, res) {
  try {
    if (handleCors(req, res)) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { adminUserId, nickname, diveLogData } = req.body;
    const userId = adminUserId || nickname; // migrate away from `nickname`

    console.log('🤖 Starting OpenAI dive analysis for:', userId);

    if (!diveLogData) {
      return res.status(400).json({ error: 'Dive log data is required' });
    }

    // Format dive log for analysis
    const diveText = formatDiveLogForOpenAI(diveLogData);
    
    console.log('📝 Formatted dive data:', diveText);

    // Create enhanced OpenAI analysis prompt with specific depth/time extraction
    const prompt = `You are Daniel Koval, a world-renowned freediving instructor and coach. Analyze this dive log and provide detailed coaching feedback:

${diveText}

${diveLogData.extractedText ? `\nDive Computer Data: ${diveLogData.extractedText}` : ''}

🎯 CRITICAL: If there's a dive profile graph or computer readout, please extract these specific metrics:
- Time to maximum depth (descent time in seconds)
- Time from maximum depth to surface (ascent time in seconds)  
- Bottom time at maximum depth (if any pause at bottom)
- Descent speed (m/s) = max depth ÷ descent time
- Ascent speed (m/s) = max depth ÷ ascent time
- Total dive time (should match ascent + descent + bottom time)

For dive profiles showing depth vs time graphs:
- Look for the steepest descent slope to calculate descent speed
- Look for the ascent slope to calculate ascent speed
- Note if there's a flat section at maximum depth (bottom time)
- Check if the profile is a sharp V-shape (no bottom time) or U-shape (with bottom time)

Please provide:
1. Performance Assessment - How did the dive go overall?
2. Technical Analysis - What went well and what needs improvement?
3. Safety Evaluation - Any safety concerns or recommendations?
4. Training Recommendations - What should the diver focus on next?
5. Progression Advice - How can they improve for future dives?
6. 📊 EXTRACTED METRICS (if available from image/data):
   - Descent time: X seconds
   - Ascent time: X seconds  
   - Descent speed: X.X m/s
   - Ascent speed: X.X m/s
   - Bottom time: X seconds
   - VDI (total time ÷ max depth): X.X sec/m

Use your expertise in freediving physiology, technique, and safety. Be encouraging but also provide specific, actionable feedback.`;

    console.log('📤 Sending to OpenAI...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are Daniel Koval, a world-class freediving instructor and coach. Provide detailed, professional coaching feedback based on dive logs.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const analysis = completion.choices[0].message.content;

    console.log('✅ OpenAI analysis complete');

    // ✅ NEW: Save analysis to Supabase with computed speeds
    const savedDiveLog = await saveAnalysisToSupabase(userId, diveLogData, analysis);
    
    if (savedDiveLog) {
      console.log('✅ Analysis saved to Supabase with computed speeds');
    } else {
      console.warn('⚠️ Could not save to Supabase, but analysis completed');
    }

    return res.status(200).json({
      success: true,
      analysis: analysis,
      diveLogId: diveLogData.id,
      supabaseDiveLogId: savedDiveLog?.id,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ OpenAI analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to analyze dive log with OpenAI'
    });
  }
}

function formatDiveLogForOpenAI(diveLog) {
  const parts = [];
  
  if (diveLog.date) parts.push(`Date: ${diveLog.date}`);
  if (diveLog.discipline) parts.push(`Discipline: ${diveLog.discipline}`);
  if (diveLog.location) parts.push(`Location: ${diveLog.location}`);
  if (diveLog.targetDepth || diveLog.target_depth) parts.push(`Target Depth: ${diveLog.targetDepth || diveLog.target_depth}m`);
  if (diveLog.reachedDepth || diveLog.reached_depth) parts.push(`Reached Depth: ${diveLog.reachedDepth || diveLog.reached_depth}m`);
  if (diveLog.totalDiveTime || diveLog.total_dive_time) parts.push(`Total Dive Time: ${diveLog.totalDiveTime || diveLog.total_dive_time}`);
  if (diveLog.mouthfillDepth || diveLog.mouthfill_depth) parts.push(`Mouthfill Depth: ${diveLog.mouthfillDepth || diveLog.mouthfill_depth}m`);
  if (diveLog.issueDepth || diveLog.issue_depth) parts.push(`Issue Depth: ${diveLog.issueDepth || diveLog.issue_depth}m`);
  if (diveLog.issueComment || diveLog.issue_comment) parts.push(`Issue: ${diveLog.issueComment || diveLog.issue_comment}`);
  if (diveLog.squeeze) parts.push(`Squeeze: Yes`);
  if (diveLog.exit) parts.push(`Exit: ${diveLog.exit}`);
  if (diveLog.attemptType || diveLog.attempt_type) parts.push(`Attempt Type: ${diveLog.attemptType || diveLog.attempt_type}`);
  if (diveLog.surfaceProtocol || diveLog.surface_protocol) parts.push(`Surface Protocol: ${diveLog.surfaceProtocol || diveLog.surface_protocol}`);
  if (diveLog.notes) parts.push(`Notes: ${diveLog.notes}`);

  return parts.join('\n');
}
