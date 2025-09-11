#!/usr/bin/env node

// Test OpenAI Vision directly with Daniel's dive computer images
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'apps/web/.env.local') });

const OpenAI = require('openai').default;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testVisionWithRealImages() {
  console.log('🤿 Testing OpenAI Vision directly with Daniel\'s dive computer images...');
  
  // Test with real dive images
  const testImages = [
    '110m pb phillipines 060719.JPG', // 110m PB
    '102m fim asia cup phillippines 61119.JPG', // 102m FIM  
    '95m cwt dbh 71118.JPG' // 95m CWT
  ];
  
  for (const imageFile of testImages) {
    const imagePath = path.join(__dirname, 'public/freedive log', imageFile);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`⚠️ Image not found: ${imageFile}`);
      continue;
    }
    
    console.log(`\n🧪 Analyzing: ${imageFile}`);
    console.log('=' + '='.repeat(60));
    
    try {
      // Read image and convert to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      console.log(`📁 Image size: ${Math.round(imageBuffer.length / 1024)}KB`);
      
      // Use the improved prompt
      const prompt = `You are an expert dive computer analyst. Your task is to READ the actual data displayed on this dive computer screen.

CRITICAL INSTRUCTIONS:
- ONLY extract data that is CLEARLY VISIBLE on the screen
- DO NOT make up, estimate, or generate hypothetical values
- If a value is not clearly readable, return null or "not_visible"
- Focus on ACTUAL NUMBERS and TEXT displayed on the device

EXTRACT ONLY VISIBLE DATA:
1. Max Depth (look for depth readings in meters or feet)
2. Dive Time (look for time displays in MM:SS or HH:MM:SS format)
3. Temperature (look for temp readings with °C or °F)
4. Date and Time stamps if visible
5. Any other clearly readable numbers

Return valid JSON:
{
  "extractedData": {
    "maxDepth": number_or_null,
    "diveTime": "MM:SS_or_null",
    "temperature": number_or_null,
    "date": "YYYY-MM-DD_or_null",
    "visibility": "clear|blurry|dark|unreadable"
  },
  "confidence": "high|medium|low",
  "analysisNotes": "string describing what was actually visible"
}`;

      console.log('📤 Sending to OpenAI Vision API...');
      const startTime = Date.now();
      
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
        max_tokens: 800,
        temperature: 0.1
      });

      const endTime = Date.now();
      console.log(`⚡ Analysis completed in ${endTime - startTime}ms`);
      
      let analysisText = response.choices[0].message.content;
      
      // Clean up response
      if (analysisText.includes('```json')) {
        analysisText = analysisText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      }
      
      console.log('\n📝 Raw OpenAI Response:');
      console.log(analysisText);
      console.log('');
      
      try {
        const parsed = JSON.parse(analysisText);
        console.log('✅ Parsed Analysis Results:');
        console.log('========================');
        
        if (parsed.extractedData) {
          const data = parsed.extractedData;
          console.log(`📊 EXTRACTED DATA:`);
          console.log(`   Max Depth: ${data.maxDepth !== null ? data.maxDepth + 'm' : 'Not visible'}`);
          console.log(`   Dive Time: ${data.diveTime || 'Not visible'}`);
          console.log(`   Temperature: ${data.temperature !== null ? data.temperature + '°C' : 'Not visible'}`);
          console.log(`   Date: ${data.date || 'Not visible'}`);
          console.log(`   Image Quality: ${data.visibility || 'Unknown'}`);
        }
        
        console.log(`\n🎯 Analysis Quality:`);
        console.log(`   Confidence: ${parsed.confidence || 'Unknown'}`);
        console.log(`   Tokens Used: ${response.usage?.total_tokens || 'Unknown'}`);
        
        if (parsed.analysisNotes) {
          console.log(`\n📄 Analysis Notes:`);
          console.log(`   ${parsed.analysisNotes}`);
        }
        
        // Check if we extracted real data
        if (parsed.extractedData?.maxDepth && parsed.extractedData.maxDepth > 0) {
          console.log(`\n🎉 SUCCESS: Extracted real depth data (${parsed.extractedData.maxDepth}m)!`);
        } else {
          console.log(`\n⚠️ No depth data extracted - may need better image quality or different prompt`);
        }
        
      } catch (parseError) {
        console.log('❌ JSON parse failed:', parseError.message);
        console.log('Raw response was likely not in JSON format');
      }
      
    } catch (error) {
      console.error(`❌ Vision analysis failed for ${imageFile}:`, error.message);
    }
    
    // Add delay between API calls
    console.log('\n⏳ Waiting 3 seconds before next image...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n🏁 All tests completed!');
}

if (require.main === module) {
  testVisionWithRealImages().catch(console.error);
}
