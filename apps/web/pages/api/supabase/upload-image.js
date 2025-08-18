// Supabase image upload API endpoint
import { createClient } from '@supabase/supabase-js'
import { decode } from 'base64-arraybuffer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  try {
    const { method } = req

    if (method === 'POST') {
      const { 
        imageData, 
        diveLogId, 
        userId, 
        nickname 
      } = req.body

      const user_id = userId || nickname || 'anonymous'

      if (!imageData || !diveLogId) {
        return res.status(400).json({ error: 'imageData and diveLogId are required' })
      }

      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '')
      
      // Generate unique filename
      const fileName = `${user_id}/${diveLogId}_${Date.now()}.jpg`
      
      try {
        // Convert base64 to ArrayBuffer
        const arrayBuffer = decode(base64Data)
        
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('dive-images')
          .upload(fileName, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: false
          })

        if (uploadError) {
          console.error('Supabase upload error:', uploadError)
          return res.status(500).json({ error: uploadError.message })
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('dive-images')
          .getPublicUrl(fileName)

        // Save image record to database
        const { data: imageRecord, error: dbError } = await supabase
          .from('dive_log_image')
          .insert([
            {
              user_id: user_id,
              dive_log_id: diveLogId,
              bucket: 'dive-images',
              path_original: fileName,
              mime_type: 'image/jpeg',
              bytes: arrayBuffer.byteLength
            }
          ])
          .select()

        if (dbError) {
          console.error('Database save error:', dbError)
          // Upload succeeded but DB save failed - continue anyway
        }

        console.log('✅ Image uploaded to Supabase Storage:', fileName)
        return res.status(200).json({
          success: true,
          imageUrl: urlData.publicUrl,
          imagePath: fileName,
          imageRecord: imageRecord?.[0]
        })

      } catch (conversionError) {
        console.error('Image conversion error:', conversionError)
        return res.status(400).json({ error: 'Invalid image data format' })
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Upload API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}
