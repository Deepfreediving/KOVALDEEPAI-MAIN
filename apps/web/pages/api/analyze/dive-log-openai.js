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
    
    // Calculate derived metrics for comprehensive analysis
    const maxDepth = parseFloat(metrics.max_depth || 0);
    const descentTime = parseFloat(metrics.descent_time || 0);
    const ascentTime = parseFloat(metrics.ascent_time || 0);
    const totalTime = parseFloat(metrics.dive_time_seconds || 0);
    const hangTime = parseFloat(metrics.hang_time || 0);
    
    // Advanced performance calculations
    const effectiveBottomTime = totalTime - descentTime - ascentTime;
    const descentRate = descentTime > 0 ? (maxDepth / descentTime * 60).toFixed(1) : 'N/A'; // m/min
    const ascentRate = ascentTime > 0 ? (maxDepth / ascentTime * 60).toFixed(1) : 'N/A'; // m/min
    const avgSpeed = totalTime > 0 ? ((maxDepth * 2) / totalTime * 60).toFixed(1) : 'N/A'; // m/min total
    const depthTimeRatio = totalTime > 0 ? (maxDepth / totalTime).toFixed(2) : 'N/A';
    const efficiencyIndex = descentTime && ascentTime ? ((descentTime + ascentTime) / totalTime * 100).toFixed(1) : 'N/A';
    
    basePrompt += `\n\n🎯 DIVE COMPUTER DATA (COMPREHENSIVE METRICS):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 BASIC METRICS:
• Max Depth: ${metrics.max_depth || 'N/A'}m
• Total Dive Time: ${metrics.dive_time || 'N/A'} (${metrics.dive_time_seconds || 'N/A'} seconds)
• Water Temperature: ${metrics.temperature || 'N/A'}°C
• Surface Interval: ${metrics.surface_interval || 'N/A'}

⏱️ TIMING ANALYSIS:
• Descent Time: ${descentTime || 'N/A'} seconds (${descentTime ? ((descentTime/totalTime)*100).toFixed(1) : 'N/A'}% of dive)
• Ascent Time: ${ascentTime || 'N/A'} seconds (${ascentTime ? ((ascentTime/totalTime)*100).toFixed(1) : 'N/A'}% of dive)
• Bottom Phase: ${effectiveBottomTime > 0 ? effectiveBottomTime : hangTime || 'N/A'} seconds
• Hang Time at Max: ${metrics.hang_time || 'N/A'} seconds

🚀 SPEED & EFFICIENCY:
• Descent Rate: ${descentRate} m/min
• Ascent Rate: ${ascentRate} m/min
• Average Speed: ${avgSpeed} m/min (total distance/time)
• Depth/Time Ratio: ${depthTimeRatio} m/s
• Movement Efficiency: ${efficiencyIndex}% (time in motion vs total)

🧠 PERFORMANCE INDICATORS:
• Depth Target Achievement: ${metrics.max_depth && diveLogData.targetDepth ? ((parseFloat(metrics.max_depth)/parseFloat(diveLogData.targetDepth || diveLogData.target_depth))*100).toFixed(1) : 'N/A'}%
• Equalization Zone (30-60m): ${maxDepth > 30 ? 'Crossed' : 'Not reached'}
• Deep Zone (>60m): ${maxDepth > 60 ? 'Entered' : 'Not reached'}
• Extreme Zone (>80m): ${maxDepth > 80 ? 'EXTREME DEPTH' : 'Standard depth'}`;

    // Add physiological stress indicators
    if (maxDepth > 40) {
      const narcosisRisk = maxDepth > 30 ? 'MODERATE' : 'LOW';
      const equalizationStress = maxDepth > 60 ? 'HIGH' : maxDepth > 40 ? 'MODERATE' : 'LOW';
      const thermalExposure = metrics.temperature && parseFloat(metrics.temperature) < 25 ? 'SIGNIFICANT' : 'MINIMAL';
      
      basePrompt += `\n\n🩺 PHYSIOLOGICAL STRESS ANALYSIS:
• Narcosis Risk: ${narcosisRisk} (depth ${maxDepth}m)
• Equalization Demand: ${equalizationStress}
• Thermal Stress: ${thermalExposure} (${metrics.temperature || 'N/A'}°C)
• Pressure at Max: ${(1 + maxDepth/10).toFixed(1)} ATA
• Lung Volume at Max: ~${(1/(1 + maxDepth/10)*100).toFixed(0)}% of surface volume`;
    }

    // Add technical analysis
    if (descentTime && ascentTime) {
      const descentAscentRatio = (descentTime / ascentTime).toFixed(2);
      const isBalanced = Math.abs(descentTime - ascentTime) / Math.max(descentTime, ascentTime) < 0.2;
      
      basePrompt += `\n\n🔧 TECHNICAL PROFILE ANALYSIS:
• Descent/Ascent Balance: ${descentAscentRatio} ratio (${isBalanced ? 'BALANCED' : 'IMBALANCED'})
• Profile Symmetry: ${isBalanced ? 'Good symmetrical profile' : 'Asymmetrical - review technique'}
• Speed Consistency: ${Math.abs(parseFloat(descentRate) - parseFloat(ascentRate)) < 10 ? 'Consistent speeds' : 'Variable speeds'}`;
    }

    if (imageAnalysis.coachingInsights) {
      const insights = imageAnalysis.coachingInsights;
      basePrompt += `\n\n🧠 AI COACHING INSIGHTS FROM DIVE COMPUTER:
• Overall Performance: ${insights.performanceRating || 'N/A'}/10
• Safety Assessment: ${insights.safetyAssessment || 'N/A'}
• Data Quality: ${insights.dataQuality || 'High'} confidence extraction`;
      
      if (insights.recommendations?.length > 0) {
        basePrompt += `\n• Computer-Based Recommendations: ${insights.recommendations.join(', ')}`;
      }
    }

    // Add safety warnings for extreme dives
    if (maxDepth > 80 || (descentTime && descentRate && parseFloat(descentRate) > 80)) {
      basePrompt += `\n\n⚠️ SAFETY ALERTS:`;
      if (maxDepth > 80) basePrompt += `\n• EXTREME DEPTH WARNING: ${maxDepth}m exceeds 80m safety threshold`;
      if (descentRate && parseFloat(descentRate) > 80) basePrompt += `\n• HIGH DESCENT RATE: ${descentRate} m/min may indicate insufficient equalization time`;
      if (ascentRate && parseFloat(ascentRate) > 90) basePrompt += `\n• RAPID ASCENT: ${ascentRate} m/min increases DCS and shallow water blackout risk`;
      if (effectiveBottomTime < 5 && maxDepth > 60) basePrompt += `\n• MINIMAL BOTTOM TIME: Only ${effectiveBottomTime}s at depth - consider longer hang time`;
    }
    
    basePrompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
🚨 IMPORTANT: All the metrics above are REAL data extracted from the actual dive computer.
Use these specific values in your coaching analysis instead of saying data is unavailable.`;
  } else if (imageAnalysis && typeof imageAnalysis === 'object') {
    // Handle legacy or different image analysis formats
    basePrompt += `\n\n📊 IMAGE ANALYSIS DATA:
${JSON.stringify(imageAnalysis, null, 2)}

🚨 IMPORTANT: Use the specific metrics from this image analysis in your coaching feedback.`;
  } else if (imageAnalysis) {
    basePrompt += `\n\n📊 DIVE COMPUTER ANALYSIS:
${imageAnalysis}

🚨 IMPORTANT: Reference the specific metrics mentioned above in your coaching analysis.`;
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
    
    // ✅ DEBUG: Log the image analysis data structure
    if (diveLogData.imageAnalysis) {
      console.log('📊 Image analysis data structure:', JSON.stringify(diveLogData.imageAnalysis, null, 2));
    } else {
      console.log('⚠️ No imageAnalysis data found in diveLogData');
    }
    
    // ✅ ENHANCED: Validate data consistency if we have both sources
    let consistencyNotes = '';
    if (diveLogData.imageAnalysis?.extractedMetrics) {
      const inconsistencies = validateDataConsistency(diveLogData, diveLogData.imageAnalysis.extractedMetrics);
      if (inconsistencies.length > 0) {
        consistencyNotes = `\n\n⚠️ DATA CONSISTENCY CHECK:\n${inconsistencies.join('\n')}`;
      }
    }

    // ✅ ELITE PERFORMANCE DETECTION: Determine coaching level based on dive metrics
    const maxDepth = parseFloat(diveLogData.reachedDepth || diveLogData.reached_depth || 
                               diveLogData.imageAnalysis?.extractedMetrics?.max_depth || 0);
    const discipline = diveLogData.discipline || '';
    const isElitePerformance = maxDepth >= 80 || 
                              (maxDepth >= 60 && ['CWT', 'FIM', 'CNF'].includes(discipline)) ||
                              (maxDepth >= 40 && discipline === 'Static Apnea');

    console.log(`🎯 Performance level detected: ${isElitePerformance ? 'ELITE' : 'INTERMEDIATE'} (depth: ${maxDepth}m, discipline: ${discipline})`);

    // ✅ DYNAMIC SYSTEM PROMPT: Adjust coaching style based on performance level
    const systemPrompt = isElitePerformance ? 
      `You are Daniel Koval, world-renowned freediving instructor and coach. You are analyzing the dive log of an ELITE-LEVEL athlete who has achieved exceptional depths (${maxDepth}m). This diver is operating at the highest levels of the sport and requires ADVANCED TECHNICAL ANALYSIS, not basic safety advice.

🏆 ELITE COACHING MODE ACTIVATED:
- Provide sophisticated technical analysis befitting a world-class athlete
- Focus on performance optimization and competitive edge refinement
- Discuss advanced physiological adaptations and techniques
- Address elite-level training periodization and progression
- Analyze technique with the precision expected at championship levels
- Avoid basic safety disclaimers - this athlete knows the risks and protocols

Your analysis should reflect the expertise level appropriate for someone diving to depths that only the world's best freedivers achieve. This is peer-to-peer elite coaching, not instructional safety guidance.` :
      
      `You are Daniel Koval, world-renowned freediving instructor and coach. Provide comprehensive coaching analysis for this intermediate-level diver (${maxDepth}m depth). Balance technical instruction with appropriate safety guidance while helping them progress toward advanced levels.`;

    // Create enhanced OpenAI analysis prompt with performance-appropriate system context
    const prompt = `${isElitePerformance ? '🏆 ELITE PERFORMANCE ANALYSIS' : '📈 PERFORMANCE DEVELOPMENT ANALYSIS'} - Analyzing ${discipline} dive to ${maxDepth}m:

${superAnalysisPrompt}${consistencyNotes}

${isElitePerformance ? `
🎯 ELITE-LEVEL COACHING ANALYSIS (World-Class Performance Standards):

1. **CHAMPIONSHIP PERFORMANCE ASSESSMENT** (Technical Excellence):
   - Competition-ready depth achievement vs target analysis
   - Elite descent/ascent rate optimization (targeting 1.2-1.5 m/s efficiency)
   - Advanced timing breakdown for competitive edge
   - Performance rating against world championship standards
   - Pre-competition readiness indicators

2. **WORLD-CLASS TECHNICAL ANALYSIS** (Precision Metrics):
   - Descent efficiency: Analyze calculated rates against elite benchmarks (65-75 m/min optimal)
   - Ascent control: Evaluate rates for competition safety margins (70-85 m/min zone)
   - Turn technique optimization at maximum depth
   - Advanced equalization flow analysis through pressure zones
   - Mouthfill timing and volume efficiency at extreme depths

3. **ELITE PHYSIOLOGICAL OPTIMIZATION**:
   - Extreme pressure adaptation analysis (${Math.round(1 + maxDepth/10)} ATA exposure)
   - Advanced narcosis management techniques at championship depths
   - Lung compression optimization and residual volume considerations
   - Thermal adaptation strategies for competition conditions
   - Heart rate variability and mammalian dive response efficiency

4. **COMPETITIVE EDGE REFINEMENT**:
   - Millisecond-level timing optimization opportunities
   - Energy conservation techniques for maximum performance
   - Advanced breath-hold physiology fine-tuning
   - Competition strategy alignment with physiological data
   - Mental performance indicators from dive profile analysis

5. **ELITE PROGRESSION TARGETS** (Championship Pathway):
   - Next-level depth targets based on current performance curve
   - Competition preparation periodization adjustments
   - Advanced technique refinements for marginal gains
   - World record pathway analysis if applicable
   - Elite mentorship and coaching refinements needed

🏆 CHAMPIONSHIP-LEVEL FOCUS AREAS:
- Technique refinements that matter at world-class levels
- Competitive advantage opportunities from data analysis
- Elite-level training periodization recommendations
- Championship preparation insights from performance metrics
- Advanced physiological optimization strategies` : `
🎯 COMPREHENSIVE COACHING ANALYSIS REQUIREMENTS:

1. **PERFORMANCE ASSESSMENT** (Use EXACT metrics above):
   - Analyze target vs achieved depth using real computer data
   - Evaluate descent/ascent rates and technique efficiency
   - Comment on timing breakdown (descent/ascent/bottom time ratios)
   - Assess overall dive performance rating

2. **TECHNICAL ANALYSIS** (Reference specific values):
   - Descent rate: ${diveLogData.imageAnalysis?.extractedMetrics ? 'Use the calculated descent rate above' : 'Calculate from available data'}
   - Ascent rate: ${diveLogData.imageAnalysis?.extractedMetrics ? 'Use the calculated ascent rate above' : 'Calculate from available data'}
   - Profile balance and symmetry analysis
   - Equalization technique evaluation (especially in 30-60m zone)
   - Turn technique and bottom time optimization

3. **PHYSIOLOGICAL EVALUATION**:
   - Pressure exposure effects at max depth
   - Thermal stress analysis from water temperature
   - Narcosis risk assessment for depth achieved
   - Lung compression effects and mouthfill requirements

4. **SAFETY REVIEW** (Critical analysis):
   - Descent/ascent speed safety margins
   - Depth progression appropriateness
   - Bottom time vs depth ratio evaluation  
   - Emergency ascent capability assessment

5. **TRAINING RECOMMENDATIONS** (Specific to metrics):
   - Areas needing improvement based on actual performance data
   - Progressive training targets for next sessions
   - Technique refinements for efficiency gains
   - Safety protocol enhancements if needed`}

🚨 CRITICAL INSTRUCTIONS:
- The comprehensive metrics above contain REAL extracted data from the actual dive computer
- You MUST reference these specific calculated values in your analysis
- DO NOT ignore descent/ascent rates, efficiency ratios, or timing breakdowns if provided
- Use exact depth, temperature, pressure, and timing values shown above
- Reference physiological stress indicators and safety thresholds provided
- Base all recommendations on the detailed performance analysis shown
${isElitePerformance ? '- This is ELITE-LEVEL coaching for a world-class athlete - provide sophisticated technical analysis' : '- Provide comprehensive coaching appropriate for skill development'}

📊 VITAL METRICS TO ANALYZE:
- Movement efficiency percentage and what it indicates
- Descent/ascent balance ratio and technique implications  
- Physiological stress levels at recorded depth and temperature
- Safety margins based on actual speeds and timing
- Performance optimization opportunities from the data

${isElitePerformance ? 
'Provide elite-level coaching analysis as Daniel Koval would for a world-class athlete - technically sophisticated, performance-focused, with championship-level insights based on the comprehensive dive computer metrics.' :
'Provide detailed analysis as Daniel Koval would - technically precise, safety-focused, and with specific actionable recommendations based on the comprehensive dive computer metrics provided above.'}`;

    console.log('📤 Sending to OpenAI...');

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1200, // ✅ Increased for elite-level analysis
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
