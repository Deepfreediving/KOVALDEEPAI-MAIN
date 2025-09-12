#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai').default;

// Load environment variables
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testVisionWithYourImage() {
  console.log('🧪 Testing OpenAI Vision with your 112m dive computer image...\n');
  
  // Your dive computer image from the screenshots
  const imagePath = path.join(process.cwd(), 'public', 'freedive log', 'Deepest dive on new mooring BO on surface and squeeze from bottom turn  121320 112m.JPG');
  
  if (!fs.existsSync(imagePath)) {
    console.error('❌ Image not found:', imagePath);
    console.log('📂 Looking for images in public/freedive log/...');
    const logDir = path.join(process.cwd(), 'public', 'freedive log');
    if (fs.existsSync(logDir)) {
      const files = fs.readdirSync(logDir);
      console.log('Available images:', files.filter(f => f.toLowerCase().includes('.jpg') || f.toLowerCase().includes('.png')));
    }
    return;
  }
  
  // Convert image to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  
  console.log(`📸 Loaded image: ${path.basename(imagePath)} (${Math.round(imageBuffer.length / 1024)}KB)`);
  
  // Test with the exact enhanced prompt from GPT-5 research
  const prompt = `You are analyzing a screenshot of a dive computer's freedive log. Extract all visible metrics and profile details and output them in JSON format. The image contains a depth vs. time graph and textual data labels.

ANCHOR WORDS TO LOOK FOR:
- "Max Depth", "Maximum Depth", "MAX", or large depth numbers with "m"/"ft"
- "Dive Time", "Duration", "Time", time in MM:SS format  
- "Surface time", "Surface Interval", surface duration before dive
- "Temp", "Temperature", numbers with "°C"/"°F"
- "Dive Mode", "Free", "Scuba", mode indicators
- Heart rate: "bpm", "HR", heart symbols, pulse data

GRAPH ANALYSIS:
- Identify the depth-time profile curve
- Find maximum depth point and when it occurred (descent time)
- Look for flat segments at bottom (hang time)
- Note ascent pattern: smooth vs choppy/stepwise
- Calculate approximate rates if graph has clear time markers

EXTRACT THESE METRICS:
1. Max Depth (deepest point, with unit m/ft)
2. Dive Time (total underwater duration MM:SS)
3. Surface Interval (time before this dive, if shown)  
4. Water Temperature at max depth (with °C/°F unit)
5. Entry/Exit timestamps (date/time if visible)
6. Descent time (start to max depth) and rate
7. Ascent time (max depth to surface) and rate
8. Hang time (duration at stable max depth)
9. Heart rate data (start/min/max bpm if present)
10. Dive mode (Free, Scuba, etc.)

CRITICAL RULES:
- Use OCR to read text labels and numbers exactly as shown
- Only extract information visible in the image
- If a metric isn't present, omit it or set as null
- Cross-check graph timing with stated dive time for consistency
- Include units separately where possible

Return valid JSON:
{
  "entry_time": "YYYY-MM-DDTHH:MM:SS_or_time_string_if_visible",
  "exit_time": "calculated_or_visible_end_time", 
  "dive_time": "MM:SS_format",
  "surface_interval": "MM:SS_or_hours_if_shown",
  "max_depth": numeric_value,
  "depth_unit": "m_or_ft",
  "max_depth_temp": numeric_temperature,
  "temp_unit": "C_or_F",
  "descent_time": "MM:SS_from_graph_analysis",
  "ascent_time": "MM:SS_from_graph_analysis", 
  "descent_rate": calculated_m_per_min_or_null,
  "ascent_rate": calculated_m_per_min_or_null,
  "hang_time": "seconds_at_stable_depth_or_0",
  "heart_rate": {
    "start_bpm": number_if_visible,
    "min_bpm": number_if_visible,
    "max_bpm": number_if_visible,
    "end_bpm": number_if_visible
  },
  "dive_mode": "Free_or_Scuba_etc",
  "confidence": 0.0_to_1.0,
  "observations": "profile_shape_and_technique_notes"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    const content = response.choices[0].message.content;
    console.log('🤖 OpenAI Vision Response:');
    console.log('─'.repeat(50));
    console.log(content);
    console.log('─'.repeat(50));
    
    // Try to parse as JSON - handle markdown code blocks
    try {
      // Remove markdown code blocks if present
      let cleanContent = content;
      if (content.includes('```json')) {
        cleanContent = content.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (content.includes('```')) {
        cleanContent = content.replace(/```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('\n🔍 Cleaned content for parsing:');
      console.log(cleanContent);
      
      const parsed = JSON.parse(cleanContent.trim());
      console.log('\n✅ Successfully Parsed JSON Response:');
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.extractedData) {
        console.log('\n📊 Extracted Metrics:');
        console.log(`  Depth: ${parsed.extractedData.maxDepth}m`);
        console.log(`  Time: ${parsed.extractedData.diveTime}`);
        console.log(`  Temperature: ${parsed.extractedData.temperature}°C`);
        console.log(`  Confidence: ${parsed.confidence}`);
      }
    } catch (parseError) {
      console.log('\n⚠️ Response is not valid JSON:', parseError.message);
      console.log('This would be handled by the API fallback logic');
    }
    
  } catch (error) {
    console.error('❌ Vision API Error:', error.message);
  }
}

testVisionWithYourImage();
