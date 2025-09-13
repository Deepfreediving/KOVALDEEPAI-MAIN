#!/usr/bin/env node

// Test new dive computer images from conversation with enhanced Vision analysis
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, 'apps/web/.env.local') });

// Import the OpenAI analysis function
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_URL || process.env.OPENAI_BASE_URL || undefined,
});

// Enhanced Vision Analysis function (matching your API)
async function analyzeWithEnhancedVision(base64Image, mimeType = 'image/jpeg') {
  const startTime = Date.now();
  console.log('🧠 Starting OpenAI Vision API call...');
  
  const longPrompt = `You are analyzing a screenshot of a dive computer's freedive log. Extract ALL visible metrics and perform comprehensive profile analysis. Output in JSON format.

🎯 CRITICAL FREEDIVING METRICS TO EXTRACT:

**BASIC METRICS:**
- Max Depth (with unit m/ft)
- Dive Time (MM:SS format)
- Surface Interval Time (time before dive)
- Water Temperature at max depth
- Date and time of dive
- Dive Mode (Free/Scuba/etc)

**ADVANCED PROFILE METRICS:**
- Descent Time (time from surface to max depth)
- Ascent Time (time from max depth to surface)
- Bottom Time (time spent at max depth ±2m)
- Descent Rate (average m/min or m/s)
- Ascent Rate (average m/min or m/s)
- Maximum Descent Rate (fastest segment)
- Maximum Ascent Rate (fastest segment)

**TECHNICAL ANALYSIS (from graph shape):**
- Profile Symmetry (descent vs ascent curve similarity)
- Turn Quality (sharpness of bottom turn - sharp/gradual/extended)
- Descent Consistency (smooth/stepped/irregular)
- Ascent Consistency (smooth/stepped/irregular)
- Equalization Pauses (visible slowdowns indicating equalization)
- Depth Zones (identify major depth transitions)

**SAFETY & PERFORMANCE INDICATORS:**
- Rapid Ascent Segments (>1m/s speed increases)
- Depth Oscillations (up/down movements indicating issues)
- Extended Bottom Phase (hang time for mouthfill/equalization)
- Temperature Stratification Effects (depth vs temp changes)
- Profile Efficiency Score (smoothness rating 1-10)

**PHYSIOLOGICAL STRESS INDICATORS:**
- Total Pressure Exposure Time (time >30m, >50m, >70m, >90m)
- Rapid Depth Changes (potential squeeze/equalization stress)
- Ascent Speed Variations (potential CO2 buildup indicators)
- Overall Dive Intensity Rating (conservative/moderate/aggressive)

🔍 CRITICAL RULES:
- Use OCR to read text labels and numbers exactly as shown
- Only extract information visible in the image
- If a metric isn't present, omit it or set as null
- Cross-check graph timing with stated dive time for consistency
- Include units separately where possible
- DO NOT make up hypothetical values

Return valid JSON:
{
  "basic_metrics": {
    "max_depth": number,
    "depth_unit": "m_or_ft", 
    "dive_time": "MM:SS",
    "dive_time_seconds": number,
    "surface_interval": "HH:MM_or_MM:SS",
    "temperature": number,
    "temp_unit": "C_or_F",
    "date": "YYYY-MM-DD",
    "time": "HH:MM:SS",
    "dive_mode": "Free_Scuba_etc"
  },
  "profile_metrics": {
    "descent_time": "MM:SS",
    "descent_time_seconds": number,
    "ascent_time": "MM:SS", 
    "ascent_time_seconds": number,
    "bottom_time_seconds": number,
    "avg_descent_rate_mps": number,
    "avg_ascent_rate_mps": number,
    "max_descent_rate_mps": number,
    "max_ascent_rate_mps": number,
    "total_pressure_time_30m": number,
    "total_pressure_time_50m": number,
    "total_pressure_time_70m": number
  },
  "technical_analysis": {
    "profile_symmetry": "excellent_good_fair_poor",
    "turn_quality": "sharp_gradual_extended",
    "descent_consistency": "smooth_stepped_irregular",
    "ascent_consistency": "smooth_stepped_irregular", 
    "equalization_pauses_detected": boolean,
    "depth_oscillations": number,
    "profile_efficiency_score": number_1_to_10
  },
  "safety_indicators": {
    "rapid_ascent_segments": number,
    "max_ascent_spike_mps": number,
    "depth_control_quality": "excellent_good_fair_poor",
    "overall_risk_level": "low_moderate_high",
    "technique_concerns": ["list_of_issues"]
  },
  "coaching_insights": {
    "dive_intensity": "conservative_moderate_aggressive",
    "primary_strengths": ["list"],
    "areas_for_improvement": ["list"],
    "safety_recommendations": ["list"],
    "technique_focus": "equalization_mouthfill_turn_ascent_etc",
    "performance_rating": number_1_to_10,
    "readiness_for_deeper": boolean
  },
  "confidence_score": number_0_to_1,
  "data_quality": "excellent_good_fair_poor",
  "extraction_notes": "any_issues_or_observations"
}`;
  
  try {
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: longPrompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: "high"
            }
          }
        ]
      }
    ];

    console.log('📡 Sending request to OpenAI Vision API...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 1000,
      temperature: 0.1
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new Error('No content in OpenAI response');
    }

    const content = response.choices[0].message.content;
    console.log('✅ OpenAI Vision API response received');
    
    // Try to parse as JSON, handle markdown code blocks
    let analysis;
    try {
      // Remove markdown code blocks if present
      let cleanContent = content;
      if (content.includes('```json')) {
        cleanContent = content.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (content.includes('```')) {
        cleanContent = content.replace(/```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('🔍 Attempting to parse cleaned content:', cleanContent.substring(0, 100) + '...');
      analysis = JSON.parse(cleanContent.trim());
      console.log('✅ Successfully parsed Vision API response');
    } catch (parseError) {
      console.warn('⚠️ Failed to parse JSON response:', parseError.message);
      console.log('Raw content:', content.substring(0, 500) + '...');
      return {
        error: parseError.message,
        raw_content: content
      };
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      analysis: analysis,
      tokens: response.usage?.total_tokens || 0,
      timing: {
        duration: duration,
        started: new Date(startTime).toISOString(),
        completed: new Date(endTime).toISOString()
      }
    };
    
  } catch (error) {
    console.error('❌ OpenAI Vision API error:', error.message);
    throw error;
  }
}

// Function to convert image file to base64
function imageToBase64(filePath) {
  return fs.readFileSync(filePath, 'base64');
}

// Test images that show different dive scenarios
const testImages = [
  // Deep technical dives
  {
    filename: "110m pb phillipines 060719.JPG",
    expectedDepth: 110,
    description: "110m personal best dive - technical deep dive",
    category: "deep_technical"
  },
  {
    filename: "Deepest dive on new mooring BO on surface and squeeze from bottom turn  121320 112m.JPG", 
    expectedDepth: 112,
    description: "112m dive with BO and squeeze - safety analysis critical",
    category: "safety_incident"
  },
  {
    filename: "New PB 106m 06022019 philipines.JPG",
    expectedDepth: 106, 
    description: "106m personal best - performance analysis",
    category: "personal_best"
  },
  // Training dives with different issues
  {
    filename: "062321 VB 105m CWT had contractions all the way down bing and strong lots of edema possible squeeze over packing.JPG",
    expectedDepth: 105,
    description: "105m with contractions and edema - technique analysis",
    category: "technique_issues"
  },
  {
    filename: "062821 95m cwt early turn going for 108m VB.JPG",
    expectedDepth: 95,
    description: "95m early turn attempt - decision making analysis", 
    category: "early_turn"
  },
  // Competition dives
  {
    filename: "102m fim asia cup phillippines 61119.JPG",
    expectedDepth: 102,
    description: "102m FIM Asia Cup competition dive",
    category: "competition"
  },
  // Different disciplines
  {
    filename: "10718 95m FIM NR cmas WC.JPG",
    expectedDepth: 95,
    description: "95m FIM National Record attempt",
    category: "fim_record"
  },
  {
    filename: "84m FIM dbh 7618.JPG",
    expectedDepth: 84,
    description: "84m FIM training dive",
    category: "fim_training"
  }
];

async function testDiveImageAnalysis() {
  console.log('🚀 Testing Enhanced Dive Computer Image Analysis');
  console.log('='.repeat(80));
  
  const results = [];
  
  for (const testImage of testImages) {
    const imagePath = path.join(__dirname, 'public/freedive log', testImage.filename);
    
    console.log(`\n🎯 Testing: ${testImage.description}`);
    console.log(`📁 File: ${testImage.filename}`);
    console.log(`🎚️ Expected depth: ${testImage.expectedDepth}m`);
    console.log(`🏷️ Category: ${testImage.category}`);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`❌ Image not found: ${testImage.filename}`);
      results.push({
        filename: testImage.filename,
        status: 'file_not_found',
        error: 'Image file not found'
      });
      continue;
    }
    
    try {
      // Convert image to base64
      const base64Image = imageToBase64(imagePath);
      console.log(`📊 Image size: ${Math.round(base64Image.length / 1024)}KB`);
      
      // Analyze with Vision API
      const startTime = Date.now();
      const visionResult = await analyzeWithEnhancedVision(base64Image, 'image/jpeg');
      const endTime = Date.now();
      
      if (visionResult.error) {
        console.log(`❌ Vision API error: ${visionResult.error}`);
        results.push({
          filename: testImage.filename,
          status: 'vision_error',
          error: visionResult.error,
          raw_content: visionResult.raw_content
        });
        continue;
      }
      
      const analysis = visionResult.analysis;
      console.log(`⏱️ Analysis time: ${endTime - startTime}ms`);
      console.log(`🔤 Tokens used: ${visionResult.tokens}`);
      
      // Extract key metrics
      const extractedDepth = analysis.basic_metrics?.max_depth;
      const diveTime = analysis.basic_metrics?.dive_time;
      const temperature = analysis.basic_metrics?.temperature;
      const profileScore = analysis.technical_analysis?.profile_efficiency_score;
      const confidence = analysis.confidence_score;
      
      console.log(`\n📊 EXTRACTED METRICS:`);
      console.log(`   🌊 Max Depth: ${extractedDepth}${analysis.basic_metrics?.depth_unit || 'm'}`);
      console.log(`   ⏲️ Dive Time: ${diveTime}`); 
      console.log(`   🌡️ Temperature: ${temperature}°${analysis.basic_metrics?.temp_unit || 'C'}`);
      console.log(`   📈 Profile Score: ${profileScore}/10`);
      console.log(`   🎯 Confidence: ${Math.round(confidence * 100)}%`);
      
      // Validation
      const depthAccuracy = extractedDepth ? Math.abs(extractedDepth - testImage.expectedDepth) : null;
      const isAccurate = depthAccuracy !== null && depthAccuracy <= 2; // Allow 2m tolerance
      
      console.log(`\n🔍 VALIDATION:`);
      console.log(`   Expected: ${testImage.expectedDepth}m`);
      console.log(`   Extracted: ${extractedDepth}m`);
      console.log(`   Accuracy: ${isAccurate ? '✅ PASS' : '❌ FAIL'} (${depthAccuracy}m difference)`);
      
      // Advanced analysis
      if (analysis.coaching_insights) {
        console.log(`\n🧠 COACHING INSIGHTS:`);
        console.log(`   🎪 Technique Focus: ${analysis.coaching_insights.technique_focus}`);
        console.log(`   ⚡ Performance Rating: ${analysis.coaching_insights.performance_rating}/10`);
        console.log(`   🛡️ Risk Level: ${analysis.safety_indicators?.overall_risk_level}`);
        if (analysis.coaching_insights.areas_for_improvement?.length > 0) {
          console.log(`   📝 Improvements: ${analysis.coaching_insights.areas_for_improvement.slice(0,2).join(', ')}`);
        }
      }
      
      results.push({
        filename: testImage.filename,
        category: testImage.category,
        status: 'success',
        extracted_depth: extractedDepth,
        expected_depth: testImage.expectedDepth,
        depth_accuracy: depthAccuracy,
        is_accurate: isAccurate,
        dive_time: diveTime,
        temperature: temperature,
        confidence: confidence,
        profile_score: profileScore,
        analysis_time: endTime - startTime,
        tokens: visionResult.tokens,
        full_analysis: analysis
      });
      
    } catch (error) {
      console.log(`❌ Error analyzing ${testImage.filename}:`, error.message);
      results.push({
        filename: testImage.filename,
        status: 'error',
        error: error.message
      });
    }
    
    console.log('-'.repeat(60));
  }
  
  // Summary Report
  console.log(`\n📋 SUMMARY REPORT`);
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.status === 'success');
  const accurate = successful.filter(r => r.is_accurate);
  const highConfidence = successful.filter(r => r.confidence > 0.8);
  
  console.log(`📊 Results: ${successful.length}/${results.length} successful analyses`);
  console.log(`🎯 Accuracy: ${accurate.length}/${successful.length} depth extractions accurate (≤2m)`);
  console.log(`🎪 Confidence: ${highConfidence.length}/${successful.length} high confidence (>80%)`);
  
  if (successful.length > 0) {
    const avgTime = Math.round(successful.reduce((sum, r) => sum + r.analysis_time, 0) / successful.length);
    const avgTokens = Math.round(successful.reduce((sum, r) => sum + r.tokens, 0) / successful.length);
    const avgConfidence = Math.round(successful.reduce((sum, r) => sum + (r.confidence || 0), 0) / successful.length * 100);
    
    console.log(`⏱️ Average analysis time: ${avgTime}ms`);
    console.log(`🔤 Average tokens used: ${avgTokens}`);
    console.log(`🎯 Average confidence: ${avgConfidence}%`);
  }
  
  // Category breakdown
  console.log(`\n📊 BY CATEGORY:`);
  const categories = [...new Set(results.map(r => r.category))];
  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const categorySuccessful = categoryResults.filter(r => r.status === 'success');
    const categoryAccurate = categorySuccessful.filter(r => r.is_accurate);
    console.log(`   ${category}: ${categorySuccessful.length}/${categoryResults.length} successful, ${categoryAccurate.length} accurate`);
  }
  
  // Save detailed results
  const reportPath = path.join(__dirname, 'vision-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    test_date: new Date().toISOString(),
    summary: {
      total_tests: results.length,
      successful: successful.length,
      accurate: accurate.length,
      high_confidence: highConfidence.length,
      avg_analysis_time: successful.length > 0 ? Math.round(successful.reduce((sum, r) => sum + r.analysis_time, 0) / successful.length) : 0,
      avg_tokens: successful.length > 0 ? Math.round(successful.reduce((sum, r) => sum + r.tokens, 0) / successful.length) : 0,
      avg_confidence: successful.length > 0 ? successful.reduce((sum, r) => sum + (r.confidence || 0), 0) / successful.length : 0
    },
    detailed_results: results
  }, null, 2));
  
  console.log(`\n💾 Detailed results saved to: ${reportPath}`);
  
  return results;
}

// Run the test
if (require.main === module) {
  testDiveImageAnalysis()
    .then(() => {
      console.log('\n✅ Vision analysis testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Vision analysis testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testDiveImageAnalysis, analyzeWithEnhancedVision };
