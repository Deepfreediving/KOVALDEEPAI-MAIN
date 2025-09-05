// 🚀 UNIFIED Dive Computer Image Upload & Analysis API
// Handles: File uploads, Base64 uploads, Enhanced Vision Analysis, Data Extraction, Coaching Insights
import OpenAI from 'openai';
import sharp from 'sharp';
import { getAdminClient } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// 🧠 Enhanced Vision Analysis with Coaching Insights
async function analyzeWithEnhancedVision(base64Image, mimeType = 'image/jpeg') {
  const analysisPrompt = `You are an expert freediving computer analyst and coach. Analyze this dive computer display image and extract ALL visible data with professional coaching insights.

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
- Rate the dive performance (1-10)

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
    "overallPerformance": "string",
    "performanceRating": number
  },
  "confidence": "high|medium|low"
}`;

  try {
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
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.1
    });

    const analysisText = response.choices[0].message.content;
    
    // Try to parse as JSON
    try {
      const structuredAnalysis = JSON.parse(analysisText);
      return {
        success: true,
        analysis: structuredAnalysis,
        rawText: analysisText,
        tokens: response.usage?.total_tokens || 0
      };
    } catch (parseError) {
      // Fallback structure if JSON parsing fails
      return {
        success: true,
        analysis: {
          extractedData: {},
          profileAnalysis: { safetyConcerns: [] },
          coachingInsights: { recommendations: [], performanceRating: 5 },
          rawAnalysis: analysisText,
          confidence: "medium"
        },
        rawText: analysisText,
        tokens: response.usage?.total_tokens || 0
      };
    }
  } catch (error) {
    console.error('❌ Vision analysis failed:', error);
    throw new Error(`Vision analysis failed: ${error.message}`);
  }
}

// 📊 Extract metrics from structured analysis
function extractMetrics(structuredAnalysis) {
  const metrics = {};
  
  if (structuredAnalysis?.extractedData) {
    const data = structuredAnalysis.extractedData;
    
    if (data.maxDepth) metrics.max_depth = data.maxDepth;
    if (data.diveTimeSeconds) metrics.dive_time_seconds = data.diveTimeSeconds;
    if (data.temperature) metrics.temperature = data.temperature;
    if (data.diveTime) metrics.dive_time_formatted = data.diveTime;
    if (data.date) metrics.dive_date = data.date;
    if (data.diveMode) metrics.dive_mode = data.diveMode;
    if (data.surfaceInterval) metrics.surface_interval = data.surfaceInterval;
    if (data.batteryStatus) metrics.battery_status = data.batteryStatus;
  }
  
  // Add coaching metrics
  if (structuredAnalysis?.coachingInsights) {
    const insights = structuredAnalysis.coachingInsights;
    if (insights.performanceRating) metrics.performance_rating = insights.performanceRating;
  }
  
  return metrics;
}

// 🗜️ Optimize image for storage and analysis
async function optimizeImage(imageBuffer) {
  const optimized = await sharp(imageBuffer)
    .resize(1920, 1080, { 
      fit: 'inside', 
      withoutEnlargement: true 
    })
    .jpeg({ 
      quality: 80, 
      progressive: true 
    })
    .toBuffer();
    
  return optimized;
}

// 📁 Ensure storage bucket exists
async function ensureStorageBucket(supabase) {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;
    
    const bucketExists = buckets.some(bucket => bucket.name === 'dive-images');
    
    if (!bucketExists) {
      console.log('📁 Creating dive-images bucket...');
      const { error: createError } = await supabase.storage.createBucket('dive-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: MAX_FILE_SIZE
      });
      
      if (createError) {
        console.warn('⚠️ Bucket creation failed:', createError);
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
    console.log('🚀 UNIFIED Dive Image Upload & Analysis starting...');
    
    let imageBuffer;
    let originalFilename;
    let userId;
    let diveLogId;
    let mimeType = 'image/jpeg';

    // 🔄 Check content type and handle accordingly
    const contentType = req.headers['content-type'] || '';
    console.log('📋 Content-Type:', contentType);
    
    if (contentType.includes('application/json')) {
      // 📱 Handle base64 upload (mobile/web apps)
      console.log('📱 Processing JSON/base64 upload...');
      
      const { imageData, userId: bodyUserId, filename, diveLogId: bodyDiveLogId } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ error: 'imageData required for base64 upload' });
      }

      if (!bodyUserId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      // Parse base64 data
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
      originalFilename = filename || 'dive-computer-image';
      userId = bodyUserId;
      diveLogId = bodyDiveLogId;
      
      // Detect mime type from base64 prefix
      const mimeMatch = imageData.match(/^data:(image\/[a-z]+);base64,/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
      
    } else if (contentType.includes('multipart/form-data')) {
      // 📁 Handle file upload - Use formidable for multipart data
      console.log('📁 Processing multipart file upload...');
      
      const formidable = (await import('formidable')).default;
      const form = formidable({
        maxFileSize: MAX_FILE_SIZE,
        keepExtensions: true,
      });

      return new Promise((resolve) => {
        form.parse(req, async (err, fields, files) => {
          if (err) {
            console.error('❌ Form parse error:', err);
            return res.status(400).json({ error: 'Failed to parse form data' });
          }

          try {
            const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
            
            if (!imageFile) {
              return res.status(400).json({ error: 'No image file provided' });
            }

            // Validate file type
            if (!ALLOWED_TYPES.includes(imageFile.mimetype)) {
              return res.status(400).json({ 
                error: 'Invalid file type. Allowed: JPEG, PNG, WebP' 
              });
            }

            const fs = await import('fs');
            imageBuffer = fs.readFileSync(imageFile.filepath);
            originalFilename = imageFile.originalFilename;
            mimeType = imageFile.mimetype;
            userId = req.headers['x-user-id'] || (Array.isArray(fields.userId) ? fields.userId[0] : fields.userId);
            diveLogId = Array.isArray(fields.diveLogId) ? fields.diveLogId[0] : fields.diveLogId;
            
            // Clean up temp file
            try {
              fs.unlinkSync(imageFile.filepath);
            } catch (cleanupError) {
              console.warn('⚠️ Could not clean up temp file:', cleanupError);
            }

            // Continue with processing
            resolve(await processImage());
          } catch (processingError) {
            console.error('❌ Processing error:', processingError);
            res.status(500).json({ error: 'Failed to process image', details: processingError.message });
          }
        });
      });
      
    } else {
      return res.status(400).json({ 
        error: 'Unsupported content type. Use multipart/form-data for file uploads or application/json for base64 uploads.' 
      });
    }

    // Process the image (for JSON uploads)
    return await processImage();

    async function processImage() {
      // Validate required fields
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      console.log('📝 Processing image:', {
        filename: originalFilename,
        originalSize: `${Math.round(imageBuffer.length / 1024)}KB`,
        userId: userId.substring(0, 8) + '...',
        diveLogId: diveLogId || 'none'
      });

      // 🗜️ Optimize image
      const optimizedBuffer = await optimizeImage(imageBuffer);
      const compressionRatio = Math.round((1 - optimizedBuffer.length / imageBuffer.length) * 100);
      
      console.log(`📉 Image optimized: ${Math.round(imageBuffer.length / 1024)}KB → ${Math.round(optimizedBuffer.length / 1024)}KB (${compressionRatio}% reduction)`);

      // 🧠 Analyze with Enhanced Vision API
      const base64Image = optimizedBuffer.toString('base64');
      console.log('🤖 Starting Enhanced Vision Analysis...');
      
      const visionResult = await analyzeWithEnhancedVision(base64Image, mimeType);
      const structuredAnalysis = visionResult.analysis;
      const extractedMetrics = extractMetrics(structuredAnalysis);
      
      console.log('✅ Enhanced Vision Analysis completed:', {
        confidence: structuredAnalysis.confidence,
        metricsExtracted: Object.keys(extractedMetrics).length,
        tokensUsed: visionResult.tokens
      });

      // ☁️ Upload to Supabase Storage
      const supabase = getAdminClient();
      await ensureStorageBucket(supabase);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileExtension = originalFilename?.split('.').pop() || 'jpg';
      const storagePath = `${userId}/${timestamp}.${fileExtension}`;
      
      console.log('☁️ Uploading to Supabase Storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('dive-images')
        .upload(storagePath, optimizedBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Storage upload failed:', uploadError);
        return res.status(500).json({ 
          error: 'Storage upload failed', 
          details: uploadError.message 
        });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('dive-images')
        .getPublicUrl(uploadData.path);
      
      const publicImageUrl = urlData.publicUrl;
      console.log('✅ Image uploaded to:', publicImageUrl);

      // 💾 Save comprehensive data to database
      const imageRecord = {
        user_id: userId,
        dive_log_id: diveLogId || null,
        bucket: 'dive-images',
        path_original: uploadData.path,
        path_compressed: uploadData.path,
        mime_type: 'image/jpeg',
        bytes: optimizedBuffer.length,
        ai_analysis: {
          // Enhanced structured analysis
          vision_analysis: structuredAnalysis,
          extracted_metrics: extractedMetrics,
          coaching_insights: structuredAnalysis.coachingInsights,
          profile_analysis: structuredAnalysis.profileAnalysis,
          safety_assessment: structuredAnalysis.coachingInsights?.safetyAssessment,
          recommendations: structuredAnalysis.coachingInsights?.recommendations || [],
          performance_rating: structuredAnalysis.coachingInsights?.performanceRating,
          confidence_score: structuredAnalysis.confidence,
          // Metadata
          processed_with: 'unified-enhanced-vision-api',
          tokens_used: visionResult.tokens,
          processed_at: new Date().toISOString(),
          original_filename: originalFilename,
          compression_ratio: compressionRatio
        },
        created_at: new Date().toISOString()
      };

      const { data: dbData, error: dbError } = await supabase
        .from('dive_log_image')
        .insert(imageRecord)
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database save failed:', dbError);
        return res.status(500).json({ 
          error: 'Failed to save image record', 
          details: dbError.message 
        });
      }

      console.log('✅ Image record saved to database:', dbData.id);

      // 🎯 Return comprehensive response
      const response = {
        success: true,
        data: {
          // Image info
          imageId: dbData.id,
          imageUrl: publicImageUrl,
          storagePath: uploadData.path,
          originalFilename: originalFilename,
          
          // File stats
          originalSize: imageBuffer.length,
          optimizedSize: optimizedBuffer.length,
          compressionRatio: compressionRatio,
          
          // Extracted data
          extractedData: structuredAnalysis.extractedData || {},
          extractedMetrics: extractedMetrics,
          
          // Analysis results
          profileAnalysis: structuredAnalysis.profileAnalysis || {},
          coachingInsights: structuredAnalysis.coachingInsights || {},
          safetyAssessment: structuredAnalysis.coachingInsights?.safetyAssessment,
          recommendations: structuredAnalysis.coachingInsights?.recommendations || [],
          performanceRating: structuredAnalysis.coachingInsights?.performanceRating,
          
          // Metadata
          confidence: structuredAnalysis.confidence,
          tokensUsed: visionResult.tokens,
          processedAt: new Date().toISOString(),
          diveLogId: diveLogId,
          processingMethod: 'unified-enhanced-vision-api'
        },
        message: 'Dive computer image uploaded and analyzed with Enhanced AI Vision + Coaching Insights'
      };

      console.log('🎉 UNIFIED upload complete:', {
        imageId: dbData.id,
        confidence: structuredAnalysis.confidence,
        metricsCount: Object.keys(extractedMetrics).length,
        recommendationsCount: structuredAnalysis.coachingInsights?.recommendations?.length || 0
      });

      return res.status(200).json(response);
    }

  } catch (error) {
    console.error('❌ UNIFIED upload error:', error);
    return res.status(500).json({
      error: 'Failed to process dive computer image',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
