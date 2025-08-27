const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config({ path: '../../.env.local' });

// Initialize OpenAI and Supabase
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDiveComputerImageProcessing() {
  console.log('🏊‍♂️ Testing Complete Dive Computer Image Processing...\n');
  
  // Test with the 95m dive image (should match your screenshot #4)
  const imagePath = path.join(process.cwd(), '../../public/freedive log', '062821 95m cwt early turn going for 108m VB.JPG');
  
  if (!fs.existsSync(imagePath)) {
    console.error('❌ Image not found:', imagePath);
    return;
  }

  console.log('📸 Processing dive computer image:', path.basename(imagePath));
  console.log('📊 File size:', fs.statSync(imagePath).size, 'bytes');

  try {
    // STEP 1: OCR Text Extraction
    console.log('\n🔍 STEP 1: OCR Text Extraction...');
    const worker = await createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\r📝 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    const { data: { text: ocrText } } = await worker.recognize(imagePath);
    await worker.terminate();
    
    console.log('\n✅ OCR completed!');
    console.log('📝 Raw OCR Text:');
    console.log('---');
    console.log(ocrText);
    console.log('---');

    // Parse OCR for dive metrics
    const ocrMetrics = parseOCRMetrics(ocrText);
    console.log('📊 OCR Extracted Metrics:', ocrMetrics);

    // STEP 2: OpenAI Vision Analysis
    console.log('\n🤖 STEP 2: OpenAI Vision Analysis...');
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this dive computer display image. This appears to be a digital dive computer showing dive metrics.

OCR Text extracted: "${ocrText}"

Please extract the visible dive metrics and provide analysis. Look for:
- Maximum depth (in meters)
- Dive time (in MM:SS format)
- Temperature (in Celsius)
- Date/time if visible
- Any other dive-related metrics

Respond with JSON:
{
  "analysis": "detailed description of the dive computer display",
  "extractedMetrics": {
    "maxDepth": "depth in meters (number only)",
    "diveTime": "time in MM:SS format",
    "temperature": "temperature in celsius (number only)",
    "date": "date if visible",
    "diveMode": "activity type if visible"
  },
  "confidence": 0.9,
  "displayType": "type of dive computer or display"
}`
            },
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

    // Parse OpenAI response (handle markdown if present)
    let rawResponse = visionResponse.choices[0].message.content;
    console.log('🔍 Raw AI response preview:', rawResponse.substring(0, 150) + '...');
    
    if (rawResponse.includes('```json')) {
      rawResponse = rawResponse.split('```json')[1].split('```')[0].trim();
    } else if (rawResponse.includes('```')) {
      rawResponse = rawResponse.split('```')[1].split('```')[0].trim();
    }
    
    const aiResult = JSON.parse(rawResponse);
    console.log('✅ OpenAI Analysis completed!');
    console.log('🤖 AI Analysis:', aiResult.analysis.substring(0, 100) + '...');
    console.log('📊 AI Extracted Metrics:', aiResult.extractedMetrics);

    // STEP 3: Save to Supabase dive_log_image table
    console.log('\n💾 STEP 3: Saving to Supabase dive_log_image table...');
    
    const imageRecord = {
      user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      dive_log_id: null, // Will link later
      bucket: 'dive-images',
      path: `test-uploads/${Date.now()}-${path.basename(imagePath)}`,
      original_filename: path.basename(imagePath),
      file_size: imageBuffer.length,
      mime_type: 'image/jpeg',
      ai_analysis: aiResult.analysis,
      extracted_metrics: aiResult.extractedMetrics,
      ocr_text: ocrText,
      created_at: new Date().toISOString()
    };

    const { data: savedImage, error: imageError } = await supabase
      .from('dive_log_image')
      .insert(imageRecord)
      .select()
      .single();

    if (imageError) {
      console.error('❌ Failed to save image record:', imageError);
      console.error('❌ Error details:', imageError.message);
      return;
    }

    console.log('✅ Image record saved with ID:', savedImage.id);

    // STEP 4: Create corresponding dive log
    console.log('\n📋 STEP 4: Creating dive log record...');
    
    const diveLogRecord = {
      id: `dive-${Date.now()}`,
      user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      date: extractDateFromFilename(path.basename(imagePath)) || '2021-06-28',
      discipline: 'CWT', // From filename
      location: 'Vertical Blue - Bahamas',
      reached_depth: parseFloat(aiResult.extractedMetrics.maxDepth) || 95,
      target_depth: parseFloat(aiResult.extractedMetrics.maxDepth) || 95,
      total_dive_time: aiResult.extractedMetrics.diveTime || '2:52',
      notes: `Auto-generated from dive computer image: ${path.basename(imagePath)}`,
      metadata: {
        imageId: savedImage.id,
        imageUrl: `dive-images/${imageRecord.path}`,
        ocrText: ocrText,
        aiAnalysis: aiResult.analysis,
        extractedMetrics: aiResult.extractedMetrics,
        ocrMetrics: ocrMetrics,
        sourceImage: path.basename(imagePath),
        processedAt: new Date().toISOString(),
        confidence: aiResult.confidence
      },
      created_at: new Date().toISOString()
    };

    const { data: savedLog, error: logError } = await supabase
      .from('dive_logs')
      .insert(diveLogRecord)
      .select()
      .single();

    if (logError) {
      console.error('❌ Failed to save dive log:', logError);
      console.error('❌ Log error details:', logError.message);
      return;
    }

    console.log('✅ Dive log saved with ID:', savedLog.id);

    // STEP 5: Link image to dive log
    const { error: linkError } = await supabase
      .from('dive_log_image')
      .update({ dive_log_id: savedLog.id })
      .eq('id', savedImage.id);

    if (linkError) {
      console.error('❌ Failed to link image to dive log:', linkError);
    } else {
      console.log('✅ Image linked to dive log successfully');
    }

    // STEP 6: Verify the data
    console.log('\n🔍 STEP 6: Verification...');
    
    const { data: verifyLog } = await supabase
      .from('dive_logs')
      .select(`
        id,
        date,
        location,
        reached_depth,
        target_depth,
        total_dive_time,
        dive_log_image (
          id,
          original_filename,
          ai_analysis,
          extracted_metrics
        )
      `)
      .eq('id', savedLog.id)
      .single();

    console.log('📊 Final verification result:');
    console.log(`   Dive Log ID: ${verifyLog.id}`);
    console.log(`   Depth: ${verifyLog.reached_depth}m`);
    console.log(`   Time: ${verifyLog.total_dive_time}`);
    console.log(`   Images linked: ${verifyLog.dive_log_image?.length || 0}`);

    console.log('\n🎉 SUCCESS! Complete dive computer image processing completed!');
    console.log('📈 This pipeline should now work in the web app.');

  } catch (error) {
    console.error('❌ Pipeline error:', error.message);
    if (error.response?.data) {
      console.error('API Error details:', error.response.data);
    }
  }
}

// Helper function to parse OCR text for dive metrics
function parseOCRMetrics(text) {
  const metrics = {};
  
  // Look for depth patterns
  const depthMatches = text.match(/(\d+(?:\.\d+)?)\s*m/gi);
  if (depthMatches && depthMatches.length > 0) {
    metrics.depths = depthMatches;
    // Usually the largest number is max depth
    const depths = depthMatches.map(d => parseFloat(d.replace(/m/gi, '')));
    metrics.maxDepth = Math.max(...depths);
  }
  
  // Look for time patterns (MM:SS)
  const timeMatches = text.match(/(\d+):(\d+)/g);
  if (timeMatches && timeMatches.length > 0) {
    metrics.times = timeMatches;
    metrics.diveTime = timeMatches[0]; // Usually first time is dive time
  }
  
  // Look for temperature
  const tempMatches = text.match(/(\d+(?:\.\d+)?)\s*°?c/gi);
  if (tempMatches && tempMatches.length > 0) {
    metrics.temperatures = tempMatches;
    metrics.temperature = parseFloat(tempMatches[0].replace(/[°c]/gi, ''));
  }
  
  return metrics;
}

// Helper function to extract date from filename
function extractDateFromFilename(filename) {
  // Look for date patterns like 062821 (MMDDYY)
  const dateMatch = filename.match(/(\d{6})/);
  if (dateMatch) {
    const dateStr = dateMatch[1];
    const month = dateStr.substring(0, 2);
    const day = dateStr.substring(2, 4);
    const year = '20' + dateStr.substring(4, 6);
    return `${year}-${month}-${day}`;
  }
  return null;
}

testDiveComputerImageProcessing();
