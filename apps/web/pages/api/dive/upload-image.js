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
async function analyzeWithEnhancedVision(base64Image, mimeType = 'image/jpeg', useShortPrompt = false) {
  const startTime = Date.now();
  console.log('🧠 Starting OpenAI Vision API call...');
  
  // Short prompt for testing performance
  const shortPrompt = `Analyze this dive computer image. Extract:
1. Max depth (meters)
2. Dive time (MM:SS)
3. Temperature 
4. Any other visible numbers

Return JSON: {"maxDepth": number, "diveTime": "MM:SS", "temperature": number}`;

  // Full detailed prompt
  const longPrompt = `You are an expert freediving coach and dive computer analyst. Analyze this dive computer display image and extract ALL visible data with advanced dive profile analysis.

EXTRACT BASIC DATA:
1. Max Depth (in meters)
2. Dive Time (in minutes:seconds format)
3. Temperature (at max depth)
4. Date and Time of dive
5. Dive Mode (Free, Apnea, etc.)
6. Surface interval time
7. Any safety warnings or alerts
8. Battery status if visible
9. Any other numeric readings

ADVANCED DIVE PROFILE ANALYSIS:
Carefully examine the depth profile graph and identify:

DESCENT PHASE:
- Average descent rate (m/s)
- Slowdowns or pauses (especially around 15-30m mouthfill zones)
- Equalization stops (visible as horizontal plateaus)
- Descent consistency (smooth vs erratic)
- Any depth where descent rate changes significantly

BOTTOM PHASE:
- Time spent at maximum depth
- Bottom time duration
- Depth consistency at bottom (steady vs fluctuating)

ASCENT PHASE:
- Average ascent rate (m/s)
- Ascent consistency (smooth vs rushed)
- Any rapid ascent periods (dangerous)
- Safety stops or decompression pauses
- Final approach to surface (controlled vs fast)

TECHNIQUE ANALYSIS:
- Mouthfill technique indicators (slowdown around 20-35m)
- Freefall utilization (constant descent rate in mid-water)
- Equalization efficiency (minimal pauses)
- Overall dive curve quality

SAFETY ASSESSMENT:
- Ascent rate safety (should be <1m/s)
- Any concerning rapid movements
- Depth progression appropriateness
- Risk factors identified

Return your response as valid JSON with this detailed structure:
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
    "descentPhase": {
      "averageDescentRate": number,
      "descentRateUnit": "m/s",
      "mouthfillSlowdown": {
        "detected": boolean,
        "depthRange": "string",
        "slowdownPercentage": number
      },
      "equalizationStops": [
        {
          "depth": number,
          "duration": "seconds"
        }
      ],
      "descentConsistency": "smooth|erratic|good",
      "freefall": {
        "startDepth": number,
        "endDepth": number,
        "utilized": boolean
      }
    },
    "bottomPhase": {
      "bottomTime": number,
      "bottomTimeUnit": "seconds",
      "depthConsistency": "steady|fluctuating",
      "maxDepthHeld": boolean
    },
    "ascentPhase": {
      "averageAscentRate": number,
      "ascentRateUnit": "m/s",
      "ascentConsistency": "smooth|rushed|controlled",
      "rapidAscentPeriods": [
        {
          "depthFrom": number,
          "depthTo": number,
          "rate": number,
          "dangerous": boolean
        }
      ],
      "safetyStops": [
        {
          "depth": number,
          "duration": "seconds"
        }
      ]
    },
    "overallProfile": {
      "curveQuality": "excellent|good|poor",
      "symmetry": "symmetric|asymmetric",
      "efficiency": "high|medium|low"
    }
  },
  "techniqueAnalysis": {
    "mouthfillTechnique": {
      "detected": boolean,
      "depth": number,
      "execution": "excellent|good|needs_work",
      "notes": "string"
    },
    "equalizationEfficiency": {
      "rating": "excellent|good|poor",
      "pauseCount": number,
      "totalPauseTime": number
    },
    "overallTechnique": {
      "rating": number,
      "strengths": ["string"],
      "areasForImprovement": ["string"]
    }
  },
  "safetyAssessment": {
    "ascentRateSafety": {
      "safe": boolean,
      "maxRate": number,
      "dangerousPeriods": ["string"]
    },
    "depthProgression": {
      "appropriate": boolean,
      "notes": "string"
    },
    "riskFactors": ["string"],
    "overallSafetyRating": "excellent|good|concerning|dangerous"
  },
  "coachingInsights": {
    "positives": ["string"],
    "improvements": ["string"],
    "nextSessionFocus": ["string"],
    "depthProgressionAdvice": "string",
    "performanceRating": number,
    "readinessForDeeper": boolean
  },
  "confidence": "high|medium|low",
  "analysisNotes": "string"
}`;

  const analysisPrompt = useShortPrompt ? shortPrompt : longPrompt;
  console.log(`📝 Using ${useShortPrompt ? 'SHORT' : 'LONG'} prompt (${analysisPrompt.length} chars)`);

  try {
    console.log('📤 Sending request to OpenAI Vision API...');
    const openaiStartTime = Date.now();
    
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
                detail: useShortPrompt ? "low" : "high" // Use low detail for short prompt
              }
            }
          ]
        }
      ],
      max_tokens: useShortPrompt ? 200 : 1500,
      temperature: 0.1
    });

    const openaiEndTime = Date.now();
    const openaiDuration = openaiEndTime - openaiStartTime;
    console.log(`⚡ OpenAI API Response Time: ${openaiDuration}ms (${(openaiDuration/1000).toFixed(2)}s)`);
    console.log(`🔢 Tokens Used: ${response.usage?.total_tokens || 'Unknown'}`);

    let analysisText = response.choices[0].message.content;
    
    // Clean up response - remove markdown code blocks if present
    if (analysisText.includes('```json')) {
      analysisText = analysisText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    } else if (analysisText.includes('```')) {
      analysisText = analysisText.replace(/```[a-zA-Z]*\s*/g, '').replace(/```\s*$/g, '');
    }
    
    // Try to parse as JSON
    console.log('🔍 Parsing OpenAI response...');
    const parseStartTime = Date.now();
    
    try {
      const structuredAnalysis = JSON.parse(analysisText);
      const parseEndTime = Date.now();
      console.log(`✅ JSON Parse Time: ${parseEndTime - parseStartTime}ms`);
      
      const totalTime = Date.now() - startTime;
      console.log(`🎯 Total Vision Analysis Time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
      
      return {
        success: true,
        analysis: structuredAnalysis,
        rawText: analysisText,
        tokens: response.usage?.total_tokens || 0,
        timing: {
          total: totalTime,
          openai: openaiDuration,
          parse: parseEndTime - parseStartTime
        }
      };
    } catch (parseError) {
      console.log('⚠️ JSON parse failed, raw AI response was:');
      console.log(analysisText);
      console.log('Parse error:', parseError.message);
      
      // Fallback structure if JSON parsing fails
      const fallbackTime = Date.now() - startTime;
      console.log(`🔄 Fallback Response Time: ${fallbackTime}ms (${(fallbackTime/1000).toFixed(2)}s)`);
      
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
        tokens: response.usage?.total_tokens || 0,
        timing: {
          total: fallbackTime,
          openai: openaiDuration,
          parse: 'failed'
        }
      };
    }
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error('❌ Vision analysis failed:', error);
    console.log(`💥 Error Time: ${errorTime}ms (${(errorTime/1000).toFixed(2)}s)`);
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
  const requestStartTime = Date.now();
  console.log(`🚀 UNIFIED Dive Image Upload & Analysis starting at ${new Date().toISOString()}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

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
      // 📱 Handle base64 upload (mobile/web apps) - Parse JSON manually since bodyParser is disabled
      console.log('📱 Processing JSON/base64 upload...');
      
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      const parsedBody = JSON.parse(body);
      
      const { imageData, userId: bodyUserId, filename, diveLogId: bodyDiveLogId } = parsedBody;
      
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
      const visionStartTime = Date.now();
      
      // Fix: safely access shortPrompt with fallback
      const useShortPrompt = req.body?.shortPrompt || false;
      const visionResult = await analyzeWithEnhancedVision(base64Image, mimeType, useShortPrompt);
      const visionEndTime = Date.now();
      const visionDuration = visionEndTime - visionStartTime;
      
      console.log(`🧠 Vision Analysis Complete: ${visionDuration}ms (${(visionDuration/1000).toFixed(2)}s)`);
      
      const structuredAnalysis = visionResult.analysis;
      const extractedMetrics = extractMetrics(structuredAnalysis);
      
      console.log('✅ Enhanced Vision Analysis completed:', {
        confidence: structuredAnalysis.confidence,
        metricsExtracted: Object.keys(extractedMetrics).length,
        tokensUsed: visionResult.tokens,
        timing: visionResult.timing
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
      
      const totalRequestTime = Date.now() - requestStartTime;
      console.log(`🎯 TOTAL REQUEST TIME: ${totalRequestTime}ms (${(totalRequestTime/1000).toFixed(2)}s)`);

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

// ✅ CRITICAL: Configure Next.js to handle multipart uploads and large files
export const config = {
  api: {
    bodyParser: false, // Disable default body parser for multipart data
    sizeLimit: '10mb', // Allow up to 10MB uploads
  },
};
