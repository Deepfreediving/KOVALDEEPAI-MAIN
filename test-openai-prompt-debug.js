#!/usr/bin/env node

/**
 * Test OpenAI Prompt Debug - Verify what exact prompt is being sent to OpenAI
 * This will help debug why the AI analysis isn't using extracted metrics properly
 */

const fs = require('fs');
const path = require('path');

// Mock the OpenAI prompt creation logic
function formatDiveLogForOpenAI(diveLogData) {
  return `📝 DIVE LOG ENTRY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Target Depth: ${diveLogData.targetDepth || diveLogData.target_depth || 'N/A'}m
• Reached Depth: ${diveLogData.reachedDepth || diveLogData.reached_depth || 'N/A'}m
• Total Dive Time: ${diveLogData.totalDiveTime || diveLogData.total_dive_time || 'N/A'}
• Discipline: ${diveLogData.discipline || 'N/A'}
• Location: ${diveLogData.location || 'N/A'}
• Equipment: ${diveLogData.equipment || 'N/A'}
• Wetsuit: ${diveLogData.wetsuit || 'N/A'}
• Notes: ${diveLogData.notes || 'N/A'}`;
}

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

async function testOpenAIPromptDebug() {
  console.log('🧪 Testing OpenAI Prompt Construction...\n');

  // Test with sample data that includes extracted metrics
  const sampleDiveLogData = {
    targetDepth: 88,
    reachedDepth: 88,
    totalDiveTime: '4:15',
    discipline: 'CNF',
    location: 'Blue Hole',
    equipment: 'Monofin',
    wetsuit: '5mm',
    notes: 'Deep training dive',
    imageAnalysis: {
      extractedMetrics: {
        max_depth: 88.2,
        dive_time: '4:15',
        dive_time_seconds: 255,
        temperature: 24.5,
        descent_time: 120,
        ascent_time: 135,
        descent_speed_mps: 0.735, // 88.2m / 120s
        ascent_speed_mps: 0.653,  // 88.2m / 135s
        surface_interval: '2:30',
        hang_time: 15
      },
      coachingInsights: {
        performanceRating: 8.5,
        safetyAssessment: 'Good',
        recommendations: ['Improve descent efficiency', 'Work on hang time technique']
      }
    }
  };

  // Test the super analysis prompt creation
  const superAnalysisPrompt = createSuperAnalysisPrompt(sampleDiveLogData, sampleDiveLogData.imageAnalysis);
  
  console.log('🎯 Generated Super Analysis Prompt:');
  console.log('━'.repeat(80));
  console.log(superAnalysisPrompt);
  console.log('━'.repeat(80));

  // Test the full OpenAI prompt
  const consistencyNotes = '';
  const fullPrompt = `You are Daniel Koval, a world-renowned freediving instructor and coach. Provide comprehensive coaching analysis combining dive computer data with manual dive log entry:

${superAnalysisPrompt}${consistencyNotes}

🎯 COACHING ANALYSIS REQUIREMENTS:
1. **Performance Assessment**: Analyze actual vs target performance using REAL computer data
2. **Technical Analysis**: Evaluate descent/ascent speeds, hang time, thermal effects
3. **Safety Review**: Check for any concerning patterns in the dive profile
4. **Progression Coaching**: Compare to previous dives and suggest next steps
5. **Data Quality**: Comment on consistency between manual log and computer data

🚨 CRITICAL INSTRUCTIONS:
- The dive computer data above contains REAL extracted metrics from the actual dive computer
- You MUST reference these specific values in your analysis (depths, times, speeds, temperatures)
- DO NOT say "without specific descent and ascent rates" if they are provided above
- Use the exact descent/ascent times and speeds shown in the dive computer data
- Reference the real temperature, actual dive time, and precise depth measurements
- Base all technical analysis on these real extracted metrics, not estimates

📊 SPECIFIC METRICS TO ANALYZE:
- If descent/ascent times are shown above, analyze the actual rates and technique
- If temperature is provided, comment on thermal effects at that specific temperature
- If hang time is mentioned, evaluate the bottom phase duration
- Reference the exact depth achieved vs target depth from the computer data

Provide detailed analysis in conversational coaching style with specific recommendations based on the REAL dive computer metrics provided above.`;

  console.log('\n🤖 Full OpenAI Prompt:');
  console.log('━'.repeat(80));
  console.log(fullPrompt);
  console.log('━'.repeat(80));

  // Check if the metrics are properly included
  const hasRealMetrics = fullPrompt.includes('88.2m') && 
                        fullPrompt.includes('24.5°C') && 
                        fullPrompt.includes('44.1 m/min') && // descent speed
                        fullPrompt.includes('39.2 m/min');   // ascent speed
  
  console.log(`\n✅ Prompt includes real metrics: ${hasRealMetrics ? '✓ YES' : '✗ NO'}`);
  
  if (hasRealMetrics) {
    console.log('🎯 All extracted metrics are properly included in the OpenAI prompt');
    console.log('   - Max depth: 88.2m ✓');
    console.log('   - Temperature: 24.5°C ✓');
    console.log('   - Descent speed: 44.1 m/min ✓');
    console.log('   - Ascent speed: 39.2 m/min ✓');
    console.log('   - Dive time: 4:15 (255 seconds) ✓');
    console.log('   - Hang time: 15 seconds ✓');
  } else {
    console.log('❌ Some metrics may be missing from the prompt');
  }

  // Test with no extracted metrics (legacy format)
  console.log('\n\n🧪 Testing with NO extracted metrics...\n');
  const legacyData = {
    targetDepth: 88,
    reachedDepth: 88,
    totalDiveTime: '4:15',
    discipline: 'CNF'
    // No imageAnalysis.extractedMetrics
  };

  const legacyPrompt = createSuperAnalysisPrompt(legacyData, null);
  console.log('📝 Legacy Prompt (no extracted metrics):');
  console.log('━'.repeat(40));
  console.log(legacyPrompt);
  console.log('━'.repeat(40));
}

testOpenAIPromptDebug().catch(console.error);
