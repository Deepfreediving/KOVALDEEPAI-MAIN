// Simple OpenAI-powered dive log analysis
import OpenAI from 'openai';
import handleCors from '@/utils/handleCors';
import { getServerClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ✅ Enhanced function to compute or extract descent/ascent speeds
function computeOrExtractSpeeds(maxDepthM, totalSeconds, bottomSeconds = 0, timeToMaxDepthSeconds, analysis = '') {
  // First try to extract from AI analysis if available
  const extractedMetrics = extractMetricsFromAnalysis(analysis);
  if (extractedMetrics.descent_seconds && extractedMetrics.ascent_seconds) {
    console.log('✅ Using AI-extracted timing data');
    return {
      descent_time: extractedMetrics.descent_seconds, // ✅ Map to correct column name
      ascent_time: extractedMetrics.ascent_seconds,   // ✅ Map to correct column name
      descent_speed_mps: Number((maxDepthM / extractedMetrics.descent_seconds).toFixed(3)),
      ascent_speed_mps: Number((maxDepthM / extractedMetrics.ascent_seconds).toFixed(3)),
      source: 'ai_extracted'
    };
  }

  // Fallback: compute from available data
  const descent = timeToMaxDepthSeconds ?? Math.max(1, Math.floor((totalSeconds - bottomSeconds) / 2));
  const ascent = Math.max(1, totalSeconds - bottomSeconds - descent);
  
  return {
    descent_time: descent,    // ✅ Map to correct column name
    ascent_time: ascent,      // ✅ Map to correct column name
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

// ✅ Link uploaded images to dive log
async function linkUploadedImages(supabase, userId, diveLogId) {
  try {
    // Find recent unlinked images for this user (last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: images, error } = await supabase
      .from('dive_log_image')
      .select('*')
      .eq('user_id', userId)
      .is('dive_log_id', null)
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(5); // Link up to 5 recent images
    
    if (error) {
      console.warn('⚠️ Error fetching images to link:', error);
      return;
    }
    
    if (images && images.length > 0) {
      console.log(`🔗 Linking ${images.length} images to dive log ${diveLogId}`);
      
      // Update images to link them to this dive log
      const { error: updateError } = await supabase
        .from('dive_log_image')
        .update({ 
          dive_log_id: diveLogId,
          updated_at: new Date().toISOString()
        })
        .in('id', images.map(img => img.id));
      
      if (updateError) {
        console.warn('⚠️ Error linking images:', updateError);
      } else {
        console.log('✅ Images linked successfully');
        
        // Log the image metrics that were captured
        images.forEach(img => {
          if (img.extracted_metrics && Object.keys(img.extracted_metrics).length > 0) {
            console.log(`📊 Image ${img.id} had metrics:`, img.extracted_metrics);
          }
        });
      }
    } else {
      console.log('ℹ️ No recent unlinked images found for user');
    }
  } catch (error) {
    console.warn('⚠️ Error in linkUploadedImages:', error);
  }
}

// ✅ NEW: Function to save analysis to Supabase
async function saveAnalysisToSupabase(userId, diveLogData, analysis) {
  try {
    const supabase = getServerClient();
    
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
      total_dive_time: totalSeconds,
      mouthfill_depth: parseFloat(diveLogData.mouthfillDepth || diveLogData.mouthfill_depth || 0),
      issue_depth: parseFloat(diveLogData.issueDepth || diveLogData.issue_depth || 0),
      issue_comment: diveLogData.issueComment || diveLogData.issue_comment || null,
      notes: diveLogData.notes || null,
      ai_analysis: analysis,
      ai_summary: aiSummary,
      ai_analysis_timestamp: new Date().toISOString(),
      // ✅ Only add valid database columns from computed speeds
      ...(computedSpeeds.descent_time && { descent_time: computedSpeeds.descent_time }),
      ...(computedSpeeds.ascent_time && { ascent_time: computedSpeeds.ascent_time }),
      ...(computedSpeeds.descent_speed_mps && { descent_speed_mps: computedSpeeds.descent_speed_mps }),
      ...(computedSpeeds.ascent_speed_mps && { ascent_speed_mps: computedSpeeds.ascent_speed_mps }),
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
    
    // ✅ NEW: Link any uploaded images to this dive log
    await linkUploadedImages(supabase, final_user_id, data.id);
    
    return data;
    
  } catch (error) {
    console.error('❌ Error saving to Supabase:', error);
    return null;
  }
}

// ✅ ENHANCED: Create comprehensive super analysis combining image + log data
function createSuperAnalysisPrompt(diveLogData, imageAnalysis = null) {
  let basePrompt = formatDiveLogForOpenAI(diveLogData);
  
  // ✅ SUPER ANALYSIS: Combine image analysis with dive log for comprehensive coaching
  if (imageAnalysis && imageAnalysis.extractedMetrics) {
    const metrics = imageAnalysis.extractedMetrics;
    
    basePrompt += `\n\n🎯 DIVE COMPUTER DATA (REAL EXTRACTED METRICS):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Max Depth: ${metrics.max_depth || 'N/A'}m
• Dive Time: ${metrics.dive_time || 'N/A'} (${metrics.dive_time_seconds || 'N/A'} seconds)
• Temperature: ${metrics.temperature || 'N/A'}°C
• Descent Time: ${metrics.descent_time || 'N/A'} seconds
• Ascent Time: ${metrics.ascent_time || 'N/A'} seconds
• Descent Speed: ${metrics.descent_speed_mps ? (metrics.descent_speed_mps * 60).toFixed(1) : 'N/A'} m/min
• Ascent Speed: ${metrics.ascent_speed_mps ? (metrics.ascent_speed_mps * 60).toFixed(1) : 'N/A'} m/min
• Surface Interval: ${metrics.surface_interval || 'N/A'}
• Hang Time: ${metrics.hang_time || 'N/A'} seconds`;

    if (imageAnalysis.coachingInsights) {
      basePrompt += `\n\n🧠 TECHNICAL ANALYSIS FROM DIVE COMPUTER:
• Performance Rating: ${imageAnalysis.coachingInsights.performanceRating || 'N/A'}/10
• Safety Assessment: ${imageAnalysis.coachingInsights.safetyAssessment || 'N/A'}`;
      
      if (imageAnalysis.coachingInsights.recommendations?.length > 0) {
        basePrompt += `\n• Vision Recommendations: ${imageAnalysis.coachingInsights.recommendations.join(', ')}`;
      }
    }
    
    basePrompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }
  
  return basePrompt;
}

// ✅ ENHANCED: Cross-validate dive computer data with manual log entry
function validateDataConsistency(diveLogData, extractedMetrics) {
  const inconsistencies = [];
  const manualDepth = parseFloat(diveLogData.reachedDepth || diveLogData.reached_depth || 0);
  const computerDepth = parseFloat(extractedMetrics.max_depth || 0);
  
  // Check depth consistency (allow 2m variance)
  if (manualDepth > 0 && computerDepth > 0 && Math.abs(manualDepth - computerDepth) > 2) {
    inconsistencies.push(`Depth mismatch: Manual ${manualDepth}m vs Computer ${computerDepth}m`);
  }
  
  // Check time format consistency
  const manualTime = diveLogData.totalDiveTime || diveLogData.total_dive_time;
  const computerTime = extractedMetrics.dive_time;
  if (manualTime && computerTime && manualTime !== computerTime) {
    inconsistencies.push(`Time mismatch: Manual ${manualTime} vs Computer ${computerTime}`);
  }
  
  return inconsistencies;
}

export default async function handler(req, res) {
  try {
    if (handleCors(req, res)) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ✅ Optional Authorization header validation (non-blocking)
    let authUserId = null;
    try {
      const authHeader = req.headers?.authorization || '';
      const match = /^Bearer\s+(.+)$/i.exec(authHeader);
      if (match && SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
          const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          const { data, error } = await supabaseAuth.auth.getUser(match[1]);
          if (!error && data?.user) {
            authUserId = data.user.id;
            console.log('✅ Valid auth token, using verified user ID');
          } else {
            console.warn('⚠️ Invalid auth token provided, proceeding without verification');
          }
        } catch (authErr) {
          console.warn('⚠️ Auth token validation failed, proceeding without verification:', authErr.message);
        }
      }
    } catch (err) {
      console.warn('⚠️ Auth header parsing failed, proceeding without verification:', err.message);
    }

    const { adminUserId, nickname, diveLogData } = req.body;
    const userId = adminUserId || authUserId || nickname; // prefer verified auth user

    console.log('🤖 Starting OpenAI dive analysis for:', userId);

    if (!diveLogData) {
      return res.status(400).json({ error: 'Dive log data is required' });
    }

    // Format dive log for analysis
    const diveText = formatDiveLogForOpenAI(diveLogData);
    
    console.log('📝 Formatted dive data:', diveText);

    // ✅ ENHANCED: Create super analysis prompt
    const superAnalysisPrompt = createSuperAnalysisPrompt(diveLogData, diveLogData.imageAnalysis);
    
    // ✅ ENHANCED: Validate data consistency if we have both sources
    let consistencyNotes = '';
    if (diveLogData.imageAnalysis?.extractedMetrics) {
      const inconsistencies = validateDataConsistency(diveLogData, diveLogData.imageAnalysis.extractedMetrics);
      if (inconsistencies.length > 0) {
        consistencyNotes = `\n\n⚠️ DATA CONSISTENCY CHECK:\n${inconsistencies.join('\n')}`;
      }
    }

    // Create enhanced OpenAI analysis prompt with super analysis
    const prompt = `You are Daniel Koval, a world-renowned freediving instructor and coach. Provide comprehensive coaching analysis combining dive computer data with manual dive log entry:

${superAnalysisPrompt}${consistencyNotes}

🎯 COACHING ANALYSIS REQUIREMENTS:
1. **Performance Assessment**: Analyze actual vs target performance using REAL computer data
2. **Technical Analysis**: Evaluate descent/ascent speeds, hang time, thermal effects
3. **Safety Review**: Check for any concerning patterns in the dive profile
4. **Progression Coaching**: Compare to previous dives and suggest next steps
5. **Data Quality**: Comment on consistency between manual log and computer data

🚨 CRITICAL: Use the EXACT extracted metrics above, not hypothetical values.
Focus on actionable coaching based on the precise dive computer readings.

Provide detailed analysis in conversational coaching style with specific recommendations.`;

    console.log('📤 Sending to OpenAI...');

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
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
  
  // ✅ FIX: Convert seconds back to MM:SS for user-friendly AI analysis
  const totalTime = diveLog.totalDiveTime || diveLog.total_dive_time;
  if (totalTime) {
    let formattedTime = totalTime;
    // If it's a pure number (seconds), convert to MM:SS
    if (/^\d+$/.test(String(totalTime))) {
      const seconds = parseInt(totalTime);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      formattedTime = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    parts.push(`Total Dive Time: ${formattedTime}`);
  }
  
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
