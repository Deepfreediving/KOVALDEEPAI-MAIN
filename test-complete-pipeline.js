#!/usr/bin/env node

// Test complete dive log analysis pipeline with real dive computer images
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

require('dotenv').config({ path: path.join(__dirname, 'apps/web/.env.local') });

// Test the complete pipeline: Image Upload → Vision Analysis → Dive Log Analysis → Coaching
async function testCompletePipeline() {
  console.log('🚀 Testing Complete Dive Log Analysis Pipeline');
  console.log('='.repeat(80));
  
  // Test cases with different dive scenarios
  const testCases = [
    {
      filename: "112m dive - Deepest dive on new mooring BO on surface and squeeze from bottom turn  121320 112m.JPG",
      actualFile: "Deepest dive on new mooring BO on surface and squeeze from bottom turn  121320 112m.JPG",
      expectedDepth: 112,
      scenario: "BO and squeeze - high risk dive",
      expectedAnalysis: ["safety", "blackout", "squeeze", "risk"],
      diveData: {
        date: "2020-12-13",
        location: "Dean's Blue Hole, Bahamas",
        discipline: "CWT",
        notes: "BO on surface and squeeze from bottom turn"
      }
    },
    {
      filename: "110m PB - 110m pb phillipines 060719.JPG", 
      actualFile: "110m pb phillipines 060719.JPG",
      expectedDepth: 110,
      scenario: "Personal Best deep dive",
      expectedAnalysis: ["performance", "technical", "achievement"],
      diveData: {
        date: "2019-06-06", 
        location: "Philippines",
        discipline: "CWT",
        notes: "Personal best dive"
      }
    },
    {
      filename: "105m training - 062321 VB 105m CWT had contractions all the way down bing and strong lots of edema possible squeeze over packing.JPG",
      actualFile: "062321 VB 105m CWT had contractions all the way down bing and strong lots of edema possible squeeze over packing.JPG", 
      expectedDepth: 105,
      scenario: "Training dive with contractions and edema",
      expectedAnalysis: ["contractions", "edema", "squeeze", "technique"],
      diveData: {
        date: "2021-06-23",
        location: "Vertical Blue",
        discipline: "CWT", 
        notes: "Had contractions all the way down, strong edema, possible squeeze from over packing"
      }
    }
  ];
  
  console.log(`\n📋 Testing ${testCases.length} complete pipeline scenarios`);
  
  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 TESTING: ${testCase.scenario}`);
    console.log(`📁 File: ${testCase.actualFile}`);
    console.log(`🎚️ Expected Depth: ${testCase.expectedDepth}m`);
    console.log(`📝 Context: ${testCase.diveData.notes}`);
    
    try {
      // Step 1: Upload and analyze dive computer image
      console.log(`\n📤 STEP 1: Uploading dive computer image...`);
      const imageResult = await uploadDiveComputerImage(testCase.actualFile);
      
      if (!imageResult.success) {
        console.log(`❌ Image upload failed: ${imageResult.error}`);
        continue;
      }
      
      console.log(`✅ Image analyzed successfully`);
      console.log(`   🌊 Extracted Depth: ${imageResult.analysis.basic_metrics?.max_depth}m`);
      console.log(`   ⏲️ Dive Time: ${imageResult.analysis.basic_metrics?.dive_time}`);
      console.log(`   🌡️ Temperature: ${imageResult.analysis.basic_metrics?.temperature}°C`);
      console.log(`   🎯 Confidence: ${Math.round((imageResult.analysis.confidence_score || 0) * 100)}%`);
      
      // Step 2: Create comprehensive dive log data combining image analysis + manual data
      console.log(`\n📊 STEP 2: Creating comprehensive dive log...`);
      const diveLogData = {
        ...testCase.diveData,
        // From image analysis
        max_depth: imageResult.analysis.basic_metrics?.max_depth,
        dive_time: imageResult.analysis.basic_metrics?.dive_time, 
        temperature: imageResult.analysis.basic_metrics?.temperature,
        descent_time: imageResult.analysis.profile_metrics?.descent_time,
        ascent_time: imageResult.analysis.profile_metrics?.ascent_time,
        avg_descent_rate: imageResult.analysis.profile_metrics?.avg_descent_rate_mps,
        avg_ascent_rate: imageResult.analysis.profile_metrics?.avg_ascent_rate_mps,
        profile_efficiency: imageResult.analysis.technical_analysis?.profile_efficiency_score,
        // Image data
        dive_computer_image_url: imageResult.imageUrl,
        extracted_metrics: imageResult.analysis
      };
      
      console.log(`✅ Dive log data compiled`);
      console.log(`   📊 Profile Score: ${diveLogData.profile_efficiency}/10`);
      console.log(`   🛡️ Risk Level: ${imageResult.analysis.safety_indicators?.overall_risk_level}`);
      
      // Step 3: Generate AI coaching analysis
      console.log(`\n🧠 STEP 3: Generating AI coaching analysis...`);
      const coachingResult = await generateCoachingAnalysis(diveLogData);
      
      if (!coachingResult.success) {
        console.log(`❌ Coaching analysis failed: ${coachingResult.error}`);
        continue;
      }
      
      console.log(`✅ Coaching analysis generated`);
      console.log(`   📝 Analysis length: ${coachingResult.analysis.length} characters`);
      
      // Extract key coaching points
      const analysisText = coachingResult.analysis.toLowerCase();
      const matchedConcepts = testCase.expectedAnalysis.filter(concept => 
        analysisText.includes(concept.toLowerCase())
      );
      
      console.log(`   🎯 Key concepts covered: ${matchedConcepts.length}/${testCase.expectedAnalysis.length}`);
      console.log(`   📋 Concepts: ${matchedConcepts.join(', ')}`);
      
      // Step 4: Validate completeness
      console.log(`\n✅ STEP 4: Pipeline validation`);
      const hasDepth = diveLogData.max_depth && diveLogData.max_depth > 0;
      const hasTime = diveLogData.dive_time && diveLogData.dive_time.length > 0;
      const hasCoaching = coachingResult.analysis && coachingResult.analysis.length > 100;
      const hasImage = diveLogData.dive_computer_image_url && diveLogData.dive_computer_image_url.length > 0;
      
      console.log(`   🌊 Depth extraction: ${hasDepth ? '✅' : '❌'}`);
      console.log(`   ⏲️ Time extraction: ${hasTime ? '✅' : '❌'}`);  
      console.log(`   📸 Image processing: ${hasImage ? '✅' : '❌'}`);
      console.log(`   🧠 Coaching analysis: ${hasCoaching ? '✅' : '❌'}`);
      
      const isComplete = hasDepth && hasTime && hasCoaching && hasImage;
      console.log(`   🎯 Pipeline Status: ${isComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
      
      // Show sample coaching excerpt
      if (hasCoaching) {
        const excerpt = coachingResult.analysis.substring(0, 200) + '...';
        console.log(`\n🧠 COACHING PREVIEW:`);
        console.log(`"${excerpt}"`);
      }
      
    } catch (error) {
      console.log(`❌ Pipeline error: ${error.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ Complete pipeline testing finished`);
}

// Function to upload dive computer image and get analysis
async function uploadDiveComputerImage(filename) {
  const imagePath = path.join(__dirname, 'public/freedive log', filename);
  
  if (!fs.existsSync(imagePath)) {
    return {
      success: false,
      error: `Image file not found: ${filename}`
    };
  }
  
  try {
    // Read image as base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Make API call to your upload endpoint
    const response = await fetch('http://localhost:3000/api/dive/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        filename: filename,
        test_mode: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      analysis: result.analysis,
      imageUrl: result.imageUrl || result.url,
      metadata: result.metadata
    };
    
  } catch (error) {
    // Fallback: Use direct OpenAI Vision if API endpoint is not available
    console.log(`⚠️ API endpoint not available, using direct Vision analysis...`);
    
    try {
      const { analyzeWithEnhancedVision } = require('./test-new-dive-images.js');
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      const visionResult = await analyzeWithEnhancedVision(base64Image, 'image/jpeg');
      
      if (visionResult.error) {
        throw new Error(visionResult.error);
      }
      
      return {
        success: true,
        analysis: visionResult.analysis,
        imageUrl: `test://${filename}`,
        metadata: visionResult.timing
      };
      
    } catch (fallbackError) {
      return {
        success: false,
        error: `Both API and fallback failed: ${fallbackError.message}`
      };
    }
  }
}

// Function to generate AI coaching analysis
async function generateCoachingAnalysis(diveLogData) {
  try {
    // Prepare coaching prompt with real dive data
    const coachingPrompt = `Analyze this freedive log and provide comprehensive coaching feedback:

DIVE DETAILS:
- Date: ${diveLogData.date}
- Location: ${diveLogData.location} 
- Discipline: ${diveLogData.discipline}
- Max Depth: ${diveLogData.max_depth}m
- Dive Time: ${diveLogData.dive_time}
- Temperature: ${diveLogData.temperature}°C
- Descent Time: ${diveLogData.descent_time}
- Ascent Time: ${diveLogData.ascent_time}
- Avg Descent Rate: ${diveLogData.avg_descent_rate}m/s
- Avg Ascent Rate: ${diveLogData.avg_ascent_rate}m/s
- Profile Efficiency: ${diveLogData.profile_efficiency}/10
- Notes: ${diveLogData.notes}

EXTRACTED METRICS:
${JSON.stringify(diveLogData.extracted_metrics?.coaching_insights || {}, null, 2)}

Provide detailed coaching analysis covering:
1. Performance assessment 
2. Safety evaluation
3. Technique observations
4. Areas for improvement
5. Training recommendations
6. Risk factors identified
7. Strengths to build upon

Write as an experienced freediving coach with deep technical knowledge.`;

    // Use the coaching analysis API endpoint if available
    try {
      const response = await fetch('http://localhost:3000/api/analyze/dive-log-openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dive_log_data: diveLogData,
          analysis_prompt: coachingPrompt,
          test_mode: true
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          analysis: result.analysis || result.coaching_analysis
        };
      }
    } catch (apiError) {
      console.log(`⚠️ Coaching API not available: ${apiError.message}`);
    }
    
    // Fallback: Direct OpenAI call
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_URL || process.env.OPENAI_BASE_URL || undefined,
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert freediving coach analyzing dive computer data to provide comprehensive coaching feedback."
        },
        {
          role: "user", 
          content: coachingPrompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });
    
    return {
      success: true,
      analysis: response.choices[0].message.content
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (require.main === module) {
  testCompletePipeline()
    .then(() => {
      console.log('\n✅ Complete pipeline testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Complete pipeline testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testCompletePipeline };
