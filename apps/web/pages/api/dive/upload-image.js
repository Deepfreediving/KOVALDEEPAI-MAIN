// 🚀 UNIFIED Dive Computer Image Upload & Analysis API
// Handles: File uploads, Base64 uploads, Enhanced Vision Analysis, Data Extraction, Coaching Insights
import OpenAI from 'openai';
import sharp from 'sharp';
import { getAdminClient } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_URL || process.env.OPENAI_BASE_URL || undefined,
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// 🧠 Enhanced Vision Analysis with Coaching Insights
async function analyzeWithEnhancedVision(base64Image, mimeType = 'image/jpeg', useShortPrompt = false) {
  const startTime = Date.now();
  console.log('🧠 Starting OpenAI Vision API call...');
  
  try {
    // Short prompt for testing performance
    const shortPrompt = `Analyze this dive computer image. Extract:
1. Max depth (meters)
2. Dive time (MM:SS)
3. Temperature 
4. Any other visible numbers

Return JSON: {"maxDepth": number, "diveTime": "MM:SS", "temperature": number}`;

    // Full detailed prompt for comprehensive analysis - Enhanced with ALL vital freediving metrics
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

🔍 GRAPH ANALYSIS INSTRUCTIONS:
1. Analyze the depth-time curve pixel by pixel
2. Calculate rates from graph coordinates if time markers visible
3. Identify any irregularities or concerning patterns
4. Note profile quality and technique indicators
5. Compare depth achieved vs time efficiency

EXTRACT THESE COMPREHENSIVE METRICS:
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
    
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: useShortPrompt ? shortPrompt : longPrompt },
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
      console.log('✅ Successfully parsed Vision API response:', analysis);
    } catch (parseError) {
      console.warn('⚠️ Failed to parse JSON response:', parseError.message);
      console.log('Raw content:', content.substring(0, 200) + '...');
      analysis = {
        extractedData: {
          maxDepth: null,
          diveTime: null,
          temperature: null,
          visibility: "unreadable"
        },
        confidence: 0.3,
        rawResponse: content
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
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error('❌ OpenAI Vision API error:', error.message);
    
    // Return fallback analysis instead of throwing
    return {
      analysis: {
        extractedData: {
          maxDepth: null,
          diveTime: null,
          temperature: null,
          visibility: "error"
        },
        confidence: 0,
        error: error.message,
        fallback: true
      },
      tokens: 0,
      timing: {
        duration: duration,
        started: new Date(startTime).toISOString(),
        completed: new Date(endTime).toISOString(),
        error: true
      }
    };
  }
}

// Create legacy extractedText for backward compatibility
function createLegacyExtractedText(structuredAnalysis) {
  if (!structuredAnalysis) return 'No analysis available';
  
  let text = '';
  
  // Handle new comprehensive structure
  if (structuredAnalysis.max_depth || structuredAnalysis.dive_time || structuredAnalysis.max_depth_temp) {
    text += `DIVE COMPUTER READOUT:\n`;
    if (structuredAnalysis.max_depth) {
      const unit = structuredAnalysis.depth_unit || 'm';
      text += `Max Depth: ${structuredAnalysis.max_depth}${unit}\n`;
    }
    if (structuredAnalysis.dive_time) text += `Dive Time: ${structuredAnalysis.dive_time}\n`;
    if (structuredAnalysis.max_depth_temp) {
      const unit = structuredAnalysis.temp_unit === 'F' ? '°F' : '°C';
      text += `Temperature: ${structuredAnalysis.max_depth_temp}${unit}\n`;
    }
    if (structuredAnalysis.entry_time) text += `Entry Time: ${structuredAnalysis.entry_time}\n`;
    if (structuredAnalysis.dive_mode) text += `Mode: ${structuredAnalysis.dive_mode}\n`;
    if (structuredAnalysis.surface_interval) text += `Surface Interval: ${structuredAnalysis.surface_interval}\n`;
    
    // Advanced metrics from graph analysis
    if (structuredAnalysis.descent_time || structuredAnalysis.ascent_time) {
      text += `\nPROFILE ANALYSIS:\n`;
      if (structuredAnalysis.descent_time) text += `Descent Time: ${structuredAnalysis.descent_time}\n`;
      if (structuredAnalysis.ascent_time) text += `Ascent Time: ${structuredAnalysis.ascent_time}\n`;
      if (structuredAnalysis.descent_rate) text += `Descent Rate: ${structuredAnalysis.descent_rate} m/min\n`;
      if (structuredAnalysis.ascent_rate) text += `Ascent Rate: ${structuredAnalysis.ascent_rate} m/min\n`;
      if (structuredAnalysis.hang_time && structuredAnalysis.hang_time !== "0") {
        text += `Bottom Time: ${structuredAnalysis.hang_time}\n`;
      }
    }
    
    // Heart rate data
    if (structuredAnalysis.heart_rate && Object.keys(structuredAnalysis.heart_rate).length > 0) {
      text += `\nHEART RATE DATA:\n`;
      const hr = structuredAnalysis.heart_rate;
      if (hr.start_bpm) text += `Start HR: ${hr.start_bpm} bpm\n`;
      if (hr.min_bpm) text += `Min HR: ${hr.min_bpm} bpm\n`;
      if (hr.max_bpm) text += `Max HR: ${hr.max_bpm} bpm\n`;
      if (hr.end_bpm) text += `End HR: ${hr.end_bpm} bpm\n`;
    }
    
    // Profile observations
    if (structuredAnalysis.observations) {
      text += `\nPROFILE OBSERVATIONS:\n${structuredAnalysis.observations}\n`;
    }
  }
  
  // Fallback to legacy structure
  else if (structuredAnalysis.extractedData) {
    const data = structuredAnalysis.extractedData;
    text += `DIVE COMPUTER READOUT:\n`;
    if (data.maxDepth) text += `Max Depth: ${data.maxDepth}m\n`;
    if (data.diveTime) text += `Dive Time: ${data.diveTime}\n`;
    if (data.temperature) text += `Temperature: ${data.temperature}°C\n`;
    if (data.date) text += `Date: ${data.date}\n`;
    if (data.diveMode) text += `Mode: ${data.diveMode}\n`;
  }
  
  // Profile analysis
  if (structuredAnalysis.profileAnalysis) {
    text += `\nPROFILE ANALYSIS:\n`;
    const profile = structuredAnalysis.profileAnalysis;
    
    if (profile.descentPhase?.averageDescentRate) {
      text += `Descent Rate: ${profile.descentPhase.averageDescentRate} m/s\n`;
    }
    if (profile.ascentPhase?.averageAscentRate) {
      text += `Ascent Rate: ${profile.ascentPhase.averageAscentRate} m/s\n`;
    }
    if (profile.bottomPhase?.bottomTime) {
      text += `Bottom Time: ${profile.bottomPhase.bottomTime} seconds\n`;
    }
  }
  
  // Coaching insights
  if (structuredAnalysis.coachingInsights) {
    text += `\nCOACHING INSIGHTS:\n`;
    const insights = structuredAnalysis.coachingInsights;
    
    if (insights.performanceRating) {
      text += `Performance Rating: ${insights.performanceRating}/10\n`;
    }
    if (insights.positives?.length) {
      text += `Strengths: ${insights.positives.join(', ')}\n`;
    }
    if (insights.improvements?.length) {
      text += `Areas for Improvement: ${insights.improvements.join(', ')}\n`;
    }
  }
  
  // Fallback to raw analysis
  if (!text && structuredAnalysis.rawAnalysis) {
    text = structuredAnalysis.rawAnalysis;
  }
  
  return text || 'Dive computer image analyzed but specific metrics could not be extracted';
}

// �📊 Extract metrics from structured analysis
function extractMetrics(structuredAnalysis) {
  const metrics = {};
  
  // Handle new comprehensive structure (direct fields)
  if (structuredAnalysis?.max_depth !== undefined) {
    metrics.max_depth = structuredAnalysis.max_depth;
  }
  if (structuredAnalysis?.dive_time) {
    metrics.dive_time_formatted = structuredAnalysis.dive_time;
    // Convert MM:SS to seconds for compatibility
    const [minutes, seconds] = structuredAnalysis.dive_time.split(':').map(Number);
    metrics.dive_time_seconds = minutes * 60 + seconds;
  }
  if (structuredAnalysis?.max_depth_temp !== undefined) {
    const unit = structuredAnalysis.temp_unit === 'F' ? '°F' : '°C';
    metrics.temperature = `${structuredAnalysis.max_depth_temp}${unit}`;
  }
  if (structuredAnalysis?.entry_time) {
    // Extract date in YYYY-MM-DD format for HTML date input
    let dateValue = structuredAnalysis.entry_time;
    if (dateValue.includes('T')) {
      // ISO timestamp - extract just the date part
      dateValue = dateValue.split('T')[0];
    }
    metrics.dive_date = dateValue;
  }
  if (structuredAnalysis?.dive_mode) {
    metrics.dive_mode = structuredAnalysis.dive_mode;
  }
  if (structuredAnalysis?.surface_interval) {
    metrics.surface_interval = structuredAnalysis.surface_interval;
  }
  
  // Advanced metrics from enhanced Vision AI
  if (structuredAnalysis?.descent_time) {
    metrics.descent_time = structuredAnalysis.descent_time;
  }
  if (structuredAnalysis?.ascent_time) {
    metrics.ascent_time = structuredAnalysis.ascent_time;
  }
  if (structuredAnalysis?.descent_rate) {
    metrics.descent_rate = structuredAnalysis.descent_rate;
  }
  if (structuredAnalysis?.ascent_rate) {
    metrics.ascent_rate = structuredAnalysis.ascent_rate;
  }
  if (structuredAnalysis?.hang_time) {
    metrics.hang_time = structuredAnalysis.hang_time;
  }
  if (structuredAnalysis?.confidence) {
    metrics.confidence = structuredAnalysis.confidence;
  }
  if (structuredAnalysis?.observations) {
    metrics.observations = structuredAnalysis.observations;
  }
  
  // Fallback to legacy structure for backward compatibility
  if (structuredAnalysis?.extractedData) {
    const data = structuredAnalysis.extractedData;
    
    if (data.maxDepth && !metrics.max_depth) metrics.max_depth = data.maxDepth;
    if (data.diveTimeSeconds && !metrics.dive_time_seconds) metrics.dive_time_seconds = data.diveTimeSeconds;
    if (data.temperature && !metrics.temperature) metrics.temperature = data.temperature;
    if (data.diveTime && !metrics.dive_time_formatted) metrics.dive_time_formatted = data.diveTime;
    if (data.date && !metrics.dive_date) metrics.dive_date = data.date;
    if (data.diveMode && !metrics.dive_mode) metrics.dive_mode = data.diveMode;
    if (data.surfaceInterval && !metrics.surface_interval) metrics.surface_interval = data.surfaceInterval;
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
  try {
    console.log('🖼️ Starting image optimization with Sharp...');
    
    // First validate the image
    const metadata = await sharp(imageBuffer).metadata();
    console.log('📊 Image metadata:', {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      size: imageBuffer.length
    });
    
    // Skip optimization for very small images or invalid formats
    if (imageBuffer.length < 1000) {
      console.warn('⚠️ Image too small, skipping optimization');
      return imageBuffer;
    }
    
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
      
    console.log('✅ Image optimization complete');
    return optimized;
  } catch (error) {
    console.error('❌ Image optimization failed:', error.message);
    console.warn('⚠️ Using original image buffer due to optimization failure');
    return imageBuffer; // Return original if optimization fails
  }
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
      try {
        for await (const chunk of req) {
          body += chunk.toString();
        }
        console.log('📝 Raw body length:', body.length);
        
        if (!body.trim()) {
          return res.status(400).json({ error: 'Empty request body' });
        }
        
        const parsedBody = JSON.parse(body);
        console.log('📋 Parsed body keys:', Object.keys(parsedBody));
        
        const { imageData, userId: bodyUserId, filename, diveLogId: bodyDiveLogId } = parsedBody;
        
        if (!imageData) {
          return res.status(400).json({ error: 'imageData required for base64 upload' });
        }

        if (!bodyUserId) {
          console.warn('⚠️ No userId provided, using temp-analysis');
          userId = 'temp-analysis';
        } else {
          userId = bodyUserId;
        }

        // Parse base64 data
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');
        originalFilename = filename || 'dive-computer-image';
        diveLogId = bodyDiveLogId;
        
        // Detect mime type from base64 prefix
        const mimeMatch = imageData.match(/^data:(image\/[a-z]+);base64,/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
        
        console.log('✅ JSON parsing successful:', {
          imageBufferSize: imageBuffer.length,
          mimeType,
          userId: userId.substring(0, 8) + '...',
          filename: originalFilename
        });
        
      } catch (parseError) {
        console.error('❌ JSON parsing failed:', parseError);
        console.error('❌ Raw body preview:', body.substring(0, 200) + '...');
        return res.status(400).json({ 
          error: 'Invalid JSON format', 
          details: parseError.message 
        });
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
      // Validate required fields - allow temp-analysis for testing
      if (!userId || (userId !== 'temp-analysis' && userId.length < 8)) {
        return res.status(400).json({ error: 'userId is required and must be valid' });
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

      // 🔄 For temp-analysis, skip database save and return analysis only
      if (userId === 'temp-analysis') {
        console.log('📊 Temp analysis mode - returning analysis without database save');
        
        const totalRequestTime = Date.now() - requestStartTime;
        console.log(`🎯 TEMP ANALYSIS TIME: ${totalRequestTime}ms (${(totalRequestTime/1000).toFixed(2)}s)`);

        // Return comprehensive response for temp analysis
        const response = {
          success: true,
          data: {
            // Analysis results
            extractedData: structuredAnalysis.extractedData || {},
            extractedMetrics: extractedMetrics,
            profileAnalysis: structuredAnalysis.profileAnalysis || {},
            coachingInsights: structuredAnalysis.coachingInsights || {},
            safetyAssessment: structuredAnalysis.coachingInsights?.safetyAssessment,
            recommendations: structuredAnalysis.coachingInsights?.recommendations || [],
            performanceRating: structuredAnalysis.coachingInsights?.performanceRating,
            
            // ✅ BACKWARD COMPATIBILITY: Provide extractedText field for legacy code
            extractedText: createLegacyExtractedText(structuredAnalysis),
            
            // Metadata
            confidence: structuredAnalysis.confidence,
            tokensUsed: visionResult.tokens,
            processedAt: new Date().toISOString(),
            processingMethod: 'temp-analysis-enhanced-vision-api'
          },
          message: 'Dive computer image analyzed (temporary analysis mode)'
        };

        return res.status(200).json(response);
      }

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
      // Handle temp-analysis by using a special temp user UUID
      let finalUserId = userId;
      if (userId === 'temp-analysis') {
        // Use a special UUID for temporary analysis
        finalUserId = 'ffffffff-ffff-ffff-ffff-ffffffffffff'; // Max UUID for temp analysis
      }
      
      const imageRecord = {
        user_id: finalUserId,
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
          
          // ✅ BACKWARD COMPATIBILITY: Provide extractedText field for legacy code
          extractedText: createLegacyExtractedText(structuredAnalysis),
          
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
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    return res.status(500).json({
      error: 'Failed to process dive computer image',
      details: error.message,
      errorName: error.name,
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
