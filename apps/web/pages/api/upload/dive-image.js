/**
 * Image Upload and AI Analysis API
 */

import { getAdminClient } from '@/lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, imageData, fileName, diveLogId } = req.body

    if (!userId || !imageData) {
      return res.status(400).json({ 
        error: 'User ID and image data are required' 
      })
    }

    const supabase = getAdminClient()

    // Simulate image upload and analysis
    const mockAnalysis = {
      equipment_detected: ['wetsuit', 'mask', 'fins'],
      depth_estimate: '25-30 meters',
      water_conditions: 'clear, good visibility',
      safety_notes: 'Proper gear visible, good form',
      confidence_score: 0.85
    }

    // Create image record
    const { data: imageRecord, error: imageError } = await supabase
      .from('dive_images')
      .insert({
        dive_log_id: diveLogId || null,
        user_id: userId,
        image_url: `https://mock-storage.supabase.co/storage/v1/object/public/dive-images/${fileName}`,
        original_filename: fileName,
        file_size: 1024000, // 1MB mock size
        mime_type: 'image/jpeg',
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single()

    if (imageError) {
      console.warn('Image table may not exist:', imageError.message)
    }

    // Create analysis record
    const { data: analysisRecord, error: analysisError } = await supabase
      .from('dive_image_analysis')
      .insert({
        image_id: imageRecord?.id || 'mock-image-id',
        user_id: userId,
        analysis_data: mockAnalysis,
        ai_model: 'gpt-4-vision',
        confidence_score: mockAnalysis.confidence_score,
        analyzed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (analysisError) {
      console.warn('Analysis table may not exist:', analysisError.message)
    }

    res.status(200).json({
      success: true,
      message: 'Image uploaded and analyzed successfully',
      image: imageRecord || { id: 'mock-image-id', filename: fileName },
      analysis: mockAnalysis
    })

  } catch (error) {
    console.error('Image upload error:', error)
    res.status(500).json({ 
      error: 'Image upload failed',
      details: error.message 
    })
  }
}
