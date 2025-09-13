// 🔄 Update Image User Association API
// Updates the user_id of an image record from temp-analysis to actual user

import { getAdminClient } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageId, userId } = req.body;

    if (!imageId || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: imageId and userId are required' 
      });
    }

    console.log(`🔄 Updating image ${imageId} user association to ${userId}`);

    const supabase = getAdminClient();

    // Check if the record exists first
    const { data: existingRecord } = await supabase
      .from('dive_log_image')
      .select('id')
      .eq('id', imageId)
      .single();

    if (!existingRecord) {
      console.log(`⚠️ Image ${imageId} not found in dive_log_image table - may already be associated`);
      return res.status(200).json({ 
        success: true, 
        message: 'Image already associated or not found',
        imageId 
      });
    }

    // Update the image record
    const { data, error } = await supabase
      .from('dive_log_image')
      .update({ user_id: userId })
      .eq('id', imageId)
      .eq('user_id', 'ffffffff-ffff-ffff-ffff-ffffffffffff') // Match temp UUID
      .select();

    if (error) {
      console.error('❌ Database update error:', error);
      return res.status(500).json({ 
        error: 'Failed to update image user association',
        details: error.message 
      });
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No image found to update - may have been updated already');
      return res.status(404).json({ 
        error: 'Image not found or already associated with user' 
      });
    }

    console.log(`✅ Successfully updated image ${imageId} user association`);

    return res.status(200).json({
      success: true,
      data: data[0],
      message: 'Image user association updated successfully'
    });

  } catch (error) {
    console.error('❌ Update image user error:', error);
    return res.status(500).json({
      error: 'Failed to update image user association',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
