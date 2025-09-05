// Enhanced dive computer image analysis using OpenAI Vision API
import formidable from 'formidable';
import OpenAI from 'openai';
import fs from 'fs';
import sharp from 'sharp';
import { getAdminClient } from '@/lib/supabase';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📸 Starting enhanced dive computer image analysis...');
    
    // Parse the multipart form data
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
    const diveLogId = Array.isArray(fields.diveLogId) ? fields.diveLogId[0] : fields.diveLogId;
    const userId = req.headers['x-user-id'] || 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('📝 Processing dive computer image:', imageFile.originalFilename);

    // Convert image to base64 for OpenAI Vision API
    const imageBuffer = fs.readFileSync(imageFile.filepath);
    
    // Optimize image if needed
    const optimizedBuffer = await sharp(imageBuffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    const optimizedBase64 = optimizedBuffer.toString('base64');

    console.log('🧠 Analyzing dive computer image with OpenAI Vision...');

    // Use OpenAI Vision to analyze the dive computer image
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a freediving expert analyzing a dive computer image. Extract ALL visible data and provide detailed analysis. 

EXTRACT THESE DATA POINTS (if visible):
- Maximum depth reached (in meters)
- Total dive time (in minutes:seconds)
- Water temperature
- Descent time
- Ascent time
- Safety stop duration
- Any warnings or alerts
- Dive profile information
- Equipment status

PROVIDE ANALYSIS ON:
- Safety concerns (rapid ascent, short safety stop, etc.)
- Performance insights
- Equipment observations
- Recommendations for improvement

Return your response in this JSON format:
{
  "extracted_data": {
    "max_depth": number or null,
    "dive_time_seconds": number or null,
    "water_temperature": number or null,
    "descent_time_seconds": number or null,
    "ascent_time_seconds": number or null,
    "safety_stop_seconds": number or null,
    "alerts": ["list of any warnings/alerts"],
    "other_metrics": {}
  },
  "safety_analysis": "Detailed safety assessment",
  "performance_insights": "Performance analysis and observations",
  "recommendations": "Specific recommendations for this diver",
  "confidence_score": number between 0-1,
  "raw_observations": "What you can see in the image"
}`
            },
            {
              type: "image_url",
              image_url: {
                "url": `data:image/jpeg;base64,${optimizedBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1500
    });

    const analysisText = response.choices[0].message.content;
    console.log('📊 Vision analysis completed');

    // Try to parse JSON from the response
    let structuredAnalysis;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.warn('⚠️ Could not parse JSON, using fallback structure');
      structuredAnalysis = {
        extracted_data: {},
        safety_analysis: analysisText,
        performance_insights: "See full analysis in safety_analysis",
        recommendations: "See full analysis in safety_analysis", 
        confidence_score: 0.5,
        raw_observations: analysisText
      };
    }

    // Upload to Supabase Storage
    const supabase = getAdminClient();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `dive-computer-${userId}-${timestamp}.jpg`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dive-images')
      .upload(fileName, optimizedBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('dive-images')
      .getPublicUrl(uploadData.path);

    console.log('🌐 Image uploaded to:', urlData.publicUrl);

    // Save comprehensive analysis to database
    const imageRecord = {
      user_id: userId,
      dive_log_id: diveLogId || null,
      bucket: 'dive-images',
      path_original: uploadData.path,
      path_compressed: uploadData.path,
      mime_type: 'image/jpeg',
      bytes: optimizedBuffer.length,
      ai_analysis: {
        vision_analysis: structuredAnalysis,
        extracted_data: structuredAnalysis.extracted_data,
        safety_analysis: structuredAnalysis.safety_analysis,
        performance_insights: structuredAnalysis.performance_insights,
        recommendations: structuredAnalysis.recommendations,
        confidence_score: structuredAnalysis.confidence_score,
        processed_with: 'openai-vision-api',
        processed_at: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    };

    const { data: dbData, error: dbError } = await supabase
      .from('dive_log_image')
      .insert(imageRecord)
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database save error:', dbError);
      throw new Error(`Failed to save image record: ${dbError.message}`);
    }

    console.log('✅ Enhanced image analysis completed:', dbData.id);

    // Clean up temp file
    try {
      fs.unlinkSync(imageFile.filepath);
    } catch (cleanupError) {
      console.warn('⚠️ Could not clean up temp file:', cleanupError);
    }

    return res.status(200).json({
      success: true,
      data: {
        imageId: dbData.id,
        imageUrl: urlData.publicUrl,
        extractedData: structuredAnalysis.extracted_data,
        safetyAnalysis: structuredAnalysis.safety_analysis,
        performanceInsights: structuredAnalysis.performance_insights,
        recommendations: structuredAnalysis.recommendations,
        confidenceScore: structuredAnalysis.confidence_score,
        fileName: imageFile.originalFilename,
        storagePath: uploadData.path,
        fileSize: optimizedBuffer.length,
        processedAt: new Date().toISOString(),
        diveLogId: diveLogId,
        processingMethod: 'openai-vision-api'
      },
      message: 'Dive computer image analyzed with OpenAI Vision API'
    });

  } catch (error) {
    console.error('❌ Enhanced image analysis error:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze dive computer image',
      details: error.message 
    });
  }
}
