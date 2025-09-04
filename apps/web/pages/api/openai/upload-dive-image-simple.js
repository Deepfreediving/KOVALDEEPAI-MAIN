// Simple image upload and text extraction for dive logs
import formidable from 'formidable';
import OpenAI from 'openai';
import fs from 'fs';
import sharp from 'sharp';
import { getAdminClient } from '@/lib/supabase';
import { extractDiveText } from '@/utils/extractTextFromImage';
export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ✅ Extract metrics from OpenAI analysis
function extractMetricsFromAnalysis(analysis) {
  const metrics = {};
  
  try {
    // Extract depth (look for patterns like "30m", "30 meters", "depth: 30")
    const depthMatch = analysis.match(/(?:depth|maximum depth|max depth):?\s*(\d+(?:\.\d+)?)\s*(?:m|meters?|ft|feet?)/i);
    if (depthMatch) {
      metrics.max_depth = parseFloat(depthMatch[1]);
    }
    
    // Extract dive time (look for patterns like "3:45", "3 minutes", "225 seconds")
    const timeMatch = analysis.match(/(?:dive time|duration|time):?\s*(\d+):(\d+)|(\d+)\s*(?:minutes?|mins?)|(\d+)\s*(?:seconds?|secs?)/i);
    if (timeMatch) {
      if (timeMatch[1] && timeMatch[2]) {
        // MM:SS format
        metrics.dive_time_seconds = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
      } else if (timeMatch[3]) {
        // Minutes
        metrics.dive_time_seconds = parseInt(timeMatch[3]) * 60;
      } else if (timeMatch[4]) {
        // Seconds
        metrics.dive_time_seconds = parseInt(timeMatch[4]);
      }
    }
    
    // Extract temperature
    const tempMatch = analysis.match(/(?:temperature|temp):?\s*(\d+(?:\.\d+)?)\s*(?:°?c|celsius|°?f|fahrenheit)/i);
    if (tempMatch) {
      metrics.temperature = parseFloat(tempMatch[1]);
    }
    
    // Extract descent/ascent times if mentioned
    const descentMatch = analysis.match(/descent time:?\s*(\d+)\s*(?:seconds?|mins?|minutes?)/i);
    if (descentMatch) {
      metrics.descent_time = parseInt(descentMatch[1]);
    }
    
    const ascentMatch = analysis.match(/ascent time:?\s*(\d+)\s*(?:seconds?|mins?|minutes?)/i);
    if (ascentMatch) {
      metrics.ascent_time = parseInt(ascentMatch[1]);
    }
    
  } catch (error) {
    console.warn('⚠️ Error extracting metrics:', error);
  }
  
  return metrics;
}

// ✅ Ensure storage bucket exists
async function ensureStorageBucket(supabase) {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;
    
    const bucketExists = buckets.some(bucket => bucket.name === 'dive-images');
    
    if (!bucketExists) {
      console.log('📁 Creating dive-images bucket...');
      const { error: createError } = await supabase.storage.createBucket('dive-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (createError) {
        console.warn('⚠️ Bucket creation error (may already exist):', createError);
      } else {
        console.log('✅ dive-images bucket created');
      }
    }
  } catch (error) {
    console.warn('⚠️ Storage bucket check error:', error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📸 Starting image upload and analysis...');
    
    // Parse the multipart form data
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
    const diveLogId = Array.isArray(fields.diveLogId) ? fields.diveLogId[0] : fields.diveLogId;

    console.log('📝 Form data received:', {
      diveLogId,
      imageFile: imageFile ? imageFile.originalFilename : 'none'
    });

    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Get user ID from request headers, body, or use admin fallback
    const userId = req.headers['x-user-id'] || req.body?.userId || 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

    // Validate file type
    if (!ALLOWED_TYPES.includes(imageFile.mimetype)) {
      return res.status(400).json({ 
        error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` 
      });
    }

    console.log('📝 Image file details:', {
      name: imageFile.originalFilename,
      type: imageFile.mimetype,
      size: imageFile.size
    });

    // Read and compress the image
    const imageBuffer = fs.readFileSync(imageFile.filepath);
    
    // Compress image using sharp
    const compressedBuffer = await sharp(imageBuffer)
      .resize(1920, 1080, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 80, 
        progressive: true 
      })
      .toBuffer();
    
    const base64Image = imageBuffer.toString('base64');

    console.log('🗜️ Image compressed:', {
      originalSize: imageBuffer.length,
      compressedSize: compressedBuffer.length,
      compressionRatio: Math.round((1 - compressedBuffer.length / imageBuffer.length) * 100) + '%'
    });

    // Step 1: Extract text using OCR first
    console.log('🔍 Extracting text with OCR...');
    let ocrText = '';
    try {
      ocrText = await extractDiveText(compressedBuffer);
      console.log('✅ OCR extraction successful:', ocrText.substring(0, 200) + '...');
    } catch (ocrError) {
      console.warn('⚠️ OCR extraction failed, will rely on OpenAI Vision:', ocrError.message);
    }

    // Step 2: Enhanced analysis with OpenAI Vision using enhanced prompt
    console.log('🤖 Analyzing image with Enhanced Vision API...');

    // Enhanced prompt for dive computer analysis with coaching insights
    const analysisPrompt = `You are an expert freediving computer analyst. Analyze this dive computer display image and extract ALL visible data in a structured format.

EXTRACT THE FOLLOWING DATA:
1. Max Depth (in meters)
2. Dive Time (in minutes:seconds format)
3. Temperature (at max depth)
4. Date and Time of dive
5. Dive Mode (Free, Apnea, etc.)
6. Surface interval time
7. Any safety warnings or alerts
8. Battery status if visible
9. Any other numeric readings

ANALYZE THE DIVE PROFILE:
- Describe the descent/ascent pattern
- Note any safety concerns from the profile
- Identify if there are any rapid ascents
- Comment on bottom time if visible

PROVIDE COACHING INSIGHTS:
- Assess dive safety based on visible data
- Comment on depth progression appropriateness
- Note any concerning patterns
- Suggest improvements if applicable

${ocrText ? `OCR detected this text: "${ocrText}". Use this to supplement your visual analysis.` : ''}

Return your response as valid JSON with this structure:
{
  "extractedData": {
    "maxDepth": number,
    "diveTime": "MM:SS",
    "diveTimeSeconds": number,
    "temperature": number,
    "date": "YYYY-MM-DD",
    "time": "HH:MM:SS",
    "diveMode": "string",
    "surfaceInterval": "HH:MM",
    "batteryStatus": "string",
    "additionalReadings": {}
  },
  "profileAnalysis": {
    "descentPattern": "string",
    "ascentPattern": "string",
    "bottomTime": "string",
    "safetyConcerns": ["string"],
    "profileQuality": "string"
  },
  "coachingInsights": {
    "safetyAssessment": "string",
    "depthProgression": "string",
    "recommendations": ["string"],
    "overallPerformance": "string"
  },
  "confidence": "high|medium|low"
}`;

    // Call OpenAI Vision API with enhanced prompt
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${imageFile.mimetype};base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.1 // Low temperature for accurate data extraction
    });

    const analysisText = response.choices[0].message.content;
    console.log('🤖 Raw Enhanced Vision API response:', analysisText);

    // Try to parse as JSON, fallback to text if it fails
    let structuredAnalysis;
    let analysis; // Keep for backward compatibility
    try {
      structuredAnalysis = JSON.parse(analysisText);
      analysis = `Enhanced Dive Computer Analysis:
Max Depth: ${structuredAnalysis.extractedData?.maxDepth || 'Not detected'}m
Dive Time: ${structuredAnalysis.extractedData?.diveTime || 'Not detected'}
Safety Assessment: ${structuredAnalysis.coachingInsights?.safetyAssessment || 'Not available'}
Recommendations: ${structuredAnalysis.coachingInsights?.recommendations?.join(', ') || 'None'}`;
      console.log('✅ Enhanced Vision analysis parsed successfully');
    } catch (parseError) {
      console.log('📝 Response is not JSON, using text analysis');
      structuredAnalysis = {
        extractedData: {},
        profileAnalysis: { safetyConcerns: [] },
        coachingInsights: { recommendations: [] },
        rawAnalysis: analysisText,
        confidence: "medium"
      };
      analysis = analysisText;
    }

    console.log('✅ Enhanced OpenAI Vision analysis complete');

    // Extract structured metrics from the enhanced analysis
    let extractedMetrics = {};
    
    if (structuredAnalysis && structuredAnalysis.extractedData) {
      // Use structured data from enhanced analysis
      const data = structuredAnalysis.extractedData;
      
      if (data.maxDepth) extractedMetrics.max_depth = data.maxDepth;
      if (data.diveTimeSeconds) extractedMetrics.dive_time_seconds = data.diveTimeSeconds;
      if (data.temperature) extractedMetrics.temperature = data.temperature;
      if (data.diveTime) extractedMetrics.dive_time_formatted = data.diveTime;
      if (data.date) extractedMetrics.dive_date = data.date;
      if (data.diveMode) extractedMetrics.dive_mode = data.diveMode;
      
      console.log('📊 Enhanced metrics extracted:', extractedMetrics);
    } else {
      // Fallback to legacy extraction method
      extractedMetrics = extractMetricsFromAnalysis(analysis);
      console.log('📊 Legacy metrics extracted:', extractedMetrics);
    }

    // Initialize Supabase admin client (needed for storage operations)
    const supabase = getAdminClient();
    
    // Ensure storage bucket exists
    await ensureStorageBucket(supabase);
    
    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = imageFile.originalFilename?.split('.').pop() || 'jpg';
    const fileName = `dive-log-${userId}-${timestamp}.${fileExtension}`;
    
    // Upload compressed image to Supabase Storage
    console.log('☁️ Uploading to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dive-images')
      .upload(fileName, compressedBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    console.log('✅ Image uploaded to storage:', uploadData.path);

    // Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('dive-images')
      .getPublicUrl(uploadData.path);
    
    const publicImageUrl = urlData.publicUrl;
    console.log('🌐 Public image URL:', publicImageUrl);

    // Save image metadata and extracted metrics to database
    console.log('💾 Saving to dive_log_image table...');
    
    // Compress the extracted data for efficient storage - now with enhanced analysis
    const compressedData = {
      analysis,
      structuredAnalysis, // Include the enhanced structured analysis
      extractedMetrics,
      ocrText: ocrText || null,
      extractedAt: new Date().toISOString(),
      confidence: structuredAnalysis?.confidence || (Object.keys(extractedMetrics).length > 0 ? 'high' : 'medium'),
      enhancedAnalysis: true // Flag to indicate this uses the enhanced analysis
    };

    const imageRecord = {
      user_id: userId,
      dive_log_id: diveLogId || null, // Link to dive log if provided
      bucket: 'dive-images',
      path_original: uploadData.path,
      path_compressed: uploadData.path, // Same as original for now
      mime_type: 'image/jpeg',
      bytes: compressedBuffer.length,
      ai_analysis: compressedData, // Store comprehensive analysis as JSONB
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

    console.log('✅ Image record saved to database:', dbData.id);

    // Clean up temp file
    try {
      fs.unlinkSync(imageFile.filepath);
    } catch (cleanupError) {
      console.warn('⚠️ Could not clean up temp file:', cleanupError);
    }

    console.log('✅ Image record saved to database:', dbData.id);

    // Clean up temp file
    try {
      fs.unlinkSync(imageFile.filepath);
    } catch (cleanupError) {
      console.warn('⚠️ Could not clean up temp file:', cleanupError);
    }

    const result = {
      success: true,
      data: {
        imageId: dbData.id,
        imageUrl: publicImageUrl, // 🚀 Critical: Include public URL
        extractedText: analysis,
        ocrText: ocrText || null, // Include raw OCR text
        extractedMetrics: extractedMetrics,
        imageAnalysis: analysis,
        // Enhanced analysis data
        enhancedAnalysis: structuredAnalysis, // Full structured analysis
        coachingInsights: structuredAnalysis?.coachingInsights || null,
        profileAnalysis: structuredAnalysis?.profileAnalysis || null,
        safetyAssessment: structuredAnalysis?.coachingInsights?.safetyAssessment || null,
        recommendations: structuredAnalysis?.coachingInsights?.recommendations || [],
        // Legacy data for backward compatibility
        fileName: imageFile.originalFilename,
        storagePath: uploadData.path,
        originalSize: imageBuffer.length,
        compressedSize: compressedBuffer.length,
        fileSize: compressedBuffer.length,
        mimeType: 'image/jpeg',
        processedAt: new Date().toISOString(),
        diveLogId: diveLogId, // Include for linking reference
        confidence: structuredAnalysis?.confidence || (Object.keys(extractedMetrics).length > 0 ? 'high' : 'medium'),
        enhancedAnalysisAvailable: !!structuredAnalysis?.extractedData
      },
      message: 'Image analyzed with Enhanced AI Vision + Coaching Insights'
    };

    console.log('📊 Image processing complete:', {
      imageId: dbData.id,
      metricsExtracted: Object.keys(extractedMetrics).length,
      storagePath: uploadData.path
    });
    
    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ Image upload/analysis error:', error);
    return res.status(500).json({
      error: 'Failed to process image',
      details: error.message
    });
  }
}
