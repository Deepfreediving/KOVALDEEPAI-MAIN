// API endpoint that uses service role key to save dive images
// This bypasses RLS policies safely on the backend
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Service role client for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageData, diveLogId, userId, analysis, extractedMetrics } = req.body;

    // Save image record using service role (bypasses RLS)
    const imageRecord = {
      user_id: userId,
      dive_log_id: diveLogId,
      bucket: 'dive-images',
      path: `dive-computer-${Date.now()}.jpg`,
      original_filename: imageData.filename || 'dive-computer.jpg',
      file_size: imageData.size || 200000,
      mime_type: 'image/jpeg',
      ai_analysis: analysis,
      extracted_metrics: extractedMetrics,
      created_at: new Date().toISOString()
    };

    const { data: savedImage, error: imageError } = await supabaseAdmin
      .from('dive_log_image')
      .insert(imageRecord)
      .select()
      .single();

    if (imageError) {
      console.error('Image save error:', imageError);
      return res.status(500).json({ error: 'Failed to save image', details: imageError });
    }

    return res.status(200).json({
      success: true,
      image: savedImage,
      message: 'Image saved successfully with service role key'
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
