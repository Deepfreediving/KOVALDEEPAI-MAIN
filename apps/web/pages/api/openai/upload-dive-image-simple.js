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

    // Step 2: Enhanced analysis with OpenAI Vision
    console.log('🤖 Analyzing image with OpenAI Vision...');

    // Use OpenAI Vision to extract text and analyze the dive profile
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please analyze this dive computer profile image. ${ocrText ? `OCR detected this text: "${ocrText}". ` : ''}Extract all readable text and data, including:
- Dive time/duration (in MM:SS format or total seconds)
- Maximum depth reached (in meters or feet)
- Temperature readings
- Descent and ascent times if visible
- Surface intervals
- Any numerical data visible on the display

Please be specific about the numbers you can read. Return the extracted data in a clear format with specific values.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${imageFile.mimetype};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const analysis = response.choices[0].message.content;
    console.log('✅ OpenAI Vision analysis complete');

    // Extract structured metrics from the analysis
    const extractedMetrics = extractMetricsFromAnalysis(analysis);
    console.log('📊 Extracted metrics:', extractedMetrics);

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
    
    // Compress the extracted data for efficient storage
    const compressedData = {
      analysis,
      extractedMetrics,
      ocrText: ocrText || null,
      extractedAt: new Date().toISOString(),
      confidence: Object.keys(extractedMetrics).length > 0 ? 'high' : 'medium'
    };

    const imageRecord = {
      user_id: userId,
      dive_log_id: diveLogId || null, // Link to dive log if provided
      bucket: 'dive-images',
      path: uploadData.path,
      original_filename: imageFile.originalFilename,
      file_size: compressedBuffer.length,
      mime_type: 'image/jpeg',
      ai_analysis: JSON.stringify(compressedData), // Store comprehensive analysis
      extracted_metrics: extractedMetrics,
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
        fileName: imageFile.originalFilename,
        storagePath: uploadData.path,
        originalSize: imageBuffer.length,
        compressedSize: compressedBuffer.length,
        fileSize: compressedBuffer.length,
        mimeType: 'image/jpeg',
        processedAt: new Date().toISOString(),
        diveLogId: diveLogId, // Include for linking reference
        confidence: Object.keys(extractedMetrics).length > 0 ? 'high' : 'medium'
      },
      message: 'Image analyzed and saved successfully with OCR + AI Vision'
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
