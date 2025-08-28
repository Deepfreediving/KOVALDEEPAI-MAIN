const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

// Initialize OpenAI and Supabase
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations
);

async function testCompleteImageProcessing() {
  console.log('🏊‍♂️ Testing Complete Image Processing Pipeline...\n');
  console.log('🔧 OCR + OpenAI Vision + Supabase Integration\n');

  const imagePath = path.join(process.cwd(), '../../public/freedive log', '061921 Vb training first dive to 100m cwt.JPG');
  
  if (!fs.existsSync(imagePath)) {
    console.error('❌ Image not found:', imagePath);
    return;
  }

  console.log('📸 Processing image:', path.basename(imagePath));
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
    console.log('📝 OCR Text:', ocrText.replace(/\n/g, ' ').substring(0, 100) + '...');

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
              text: `Analyze this dive computer display image. Extract all visible metrics and provide a detailed analysis.

OCR Text for reference: "${ocrText}"

Please respond with JSON format:
{
  "analysis": "detailed description of what you see",
  "extractedMetrics": {
    "date": "YYYY-MM-DD",
    "maxDepth": "depth in meters",
    "diveTime": "time in MM:SS format",
    "temperature": "temperature in celsius",
    "surfaceTime": "surface interval",
    "diveNumber": "dive number if visible"
  },
  "confidence": 0.9
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

    const rawResponse = visionResponse.choices[0].message.content;
    console.log('🔍 Raw OpenAI response:', rawResponse.substring(0, 200) + '...');
    
    // Extract JSON from markdown code blocks if present
    let jsonContent = rawResponse;
    if (rawResponse.includes('```json')) {
      jsonContent = rawResponse.split('```json')[1].split('```')[0].trim();
    } else if (rawResponse.includes('```')) {
      jsonContent = rawResponse.split('```')[1].split('```')[0].trim();
    }
    
    const aiResult = JSON.parse(jsonContent);
    console.log('✅ OpenAI Analysis completed!');
    console.log('🤖 AI Analysis:', aiResult.analysis.substring(0, 100) + '...');
    console.log('📊 Extracted Metrics:', aiResult.extractedMetrics);

    // STEP 3: Save to Supabase
    console.log('\n💾 STEP 3: Saving to Supabase...');
    
    // Create image record
    const imageRecord = {
      user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Admin user ID
      dive_log_id: null, // We'll create the dive log after
      bucket: 'dive-images',
      path: `test-images/${Date.now()}-${path.basename(imagePath)}`,
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
      return;
    }

    console.log('✅ Image record saved:', savedImage.id);

    // Create dive log record
    const diveLogRecord = {
      id: `dive-${Date.now()}`,
      user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      date: aiResult.extractedMetrics.date || '2021-06-19',
      discipline: 'CWT', // From filename
      location: 'Vertical Blue - Bahamas', // From filename context
      reached_depth: parseFloat(aiResult.extractedMetrics.maxDepth) || 100,
      total_dive_time: aiResult.extractedMetrics.diveTime || '4:38',
      notes: `Processed from dive computer image: ${path.basename(imagePath)}`,
      metadata: {
        imageId: savedImage.id,
        ocrText,
        aiAnalysis: aiResult.analysis,
        extractedMetrics: aiResult.extractedMetrics,
        sourceImage: path.basename(imagePath),
        processedAt: new Date().toISOString()
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
      return;
    }

    console.log('✅ Dive log saved:', savedLog.id);

    // Update image record with dive log ID
    await supabase
      .from('dive_log_image')
      .update({ dive_log_id: savedLog.id })
      .eq('id', savedImage.id);

    console.log('\n🎉 SUCCESS! Complete pipeline test completed');
    console.log('📊 Results Summary:');
    console.log(`   Image ID: ${savedImage.id}`);
    console.log(`   Dive Log ID: ${savedLog.id}`);
    console.log(`   Max Depth: ${aiResult.extractedMetrics.maxDepth || 'N/A'}`);
    console.log(`   Dive Time: ${aiResult.extractedMetrics.diveTime || 'N/A'}`);
    console.log(`   Temperature: ${aiResult.extractedMetrics.temperature || 'N/A'}`);
    console.log(`   Confidence: ${aiResult.confidence || 'N/A'}`);

  } catch (error) {
    console.error('❌ Pipeline test error:', error.message);
    if (error.response?.data) {
      console.error('API Error details:', error.response.data);
    }
  }
}

testCompleteImageProcessing();
