// Alternative image upload API with better Vercel compatibility
import { getAdminSupabaseClient } from '@/lib/supabaseServerClient';
import OpenAI from 'openai';
import sharp from 'sharp';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Extract metrics from OpenAI analysis
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
    
  } catch (error) {
    console.warn('⚠️ Error extracting metrics:', error);
  }
  
  return metrics;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔧 Alternative image upload - processing base64 image...');
    
    // Expect base64 encoded image in request body
    const { imageData, userId, filename } = req.body;
    
    if (!imageData || !userId) {
      return res.status(400).json({ error: 'imageData and userId required' });
    }

    // Parse base64 data
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    console.log('📝 Processing image:', {
      filename: filename || 'uploaded-image',
      size: `${Math.round(imageBuffer.length / 1024)}KB`
    });

    // Compress image
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

    console.log(`📉 Compressed: ${Math.round(imageBuffer.length / 1024)}KB → ${Math.round(compressedBuffer.length / 1024)}KB`);

    // Convert to base64 for OpenAI
    const base64Image = compressedBuffer.toString('base64');

    // Analyze with OpenAI Vision
    console.log('🤖 Analyzing image with OpenAI Vision...');
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this dive computer image and extract all visible information including:
              - Maximum depth reached
              - Dive time/duration  
              - Water temperature
              - Descent/ascent times if visible
              - Safety stop information
              - Any alerts or warnings
              - Surface interval if shown
              
              Please provide a detailed analysis of what you can see in this dive computer display.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const analysis = analysisResponse.choices[0].message.content;
    console.log('🤖 Analysis completed:', analysis.substring(0, 200) + '...');

    // Extract structured metrics
    const metrics = extractMetricsFromAnalysis(analysis);
    console.log('📊 Extracted metrics:', metrics);

    // Upload to Supabase Storage
    const supabase = getAdminSupabaseClient();
    const timestamp = Date.now();
    const fileExtension = 'jpg';
    const storagePath = `${userId}/${timestamp}.${fileExtension}`;

    console.log('☁️ Uploading to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dive-images')
      .upload(storagePath, compressedBuffer, {
        contentType: 'image/jpeg',
        upsert: true
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
      .getPublicUrl(storagePath);

    const imageUrl = urlData.publicUrl;
    console.log('✅ Image uploaded successfully:', imageUrl);

    // Save metadata to database
    const { data: dbData, error: dbError } = await supabase
      .from('dive_log_image')
      .insert({
        user_id: userId,
        bucket: 'dive-images',
        path_original: storagePath,
        mime_type: 'image/jpeg',
        bytes: compressedBuffer.length,
        ocr_text: analysis,
        ai_analysis: metrics,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.warn('⚠️ Database save failed:', dbError);
    } else {
      console.log('✅ Metadata saved to database');
    }

    res.status(200).json({
      success: true,
      extractedText: analysis,
      metrics: metrics,
      imageUrl: imageUrl,
      imageId: dbData?.id || null
    });

  } catch (error) {
    console.error('❌ Image processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process image', 
      details: error.message 
    });
  }
}
