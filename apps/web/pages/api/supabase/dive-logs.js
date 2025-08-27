// Supabase dive logs API endpoint
import { getServerSupabaseClient } from '@/lib/supabaseServerClient'

const supabase = getServerSupabaseClient();

export default async function handler(req, res) {
  try {
    const { method } = req

    if (method === 'GET') {
      // Get user's dive logs (support both authenticated and anonymous users)
      const { nickname, userId, email } = req.query
      const user_identifier = userId || nickname || email || 'anonymous'

      // ✅ ADMIN FALLBACK: If user_identifier matches admin patterns, use admin ID directly
      const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const adminPatterns = ['daniel_koval', 'Daniel Koval', 'daniel@deepfreediving.com', 'danielkoval@example.com']
      const adminUUIDs = ['90d62ddb-d8ec-41b6-a8cd-77466e5bcfbc'] // Add the authenticated user's UUID
      
      let final_user_id;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_identifier)
      
      // Check if email indicates admin user
      if (email && adminPatterns.includes(email)) {
        final_user_id = ADMIN_USER_ID
        console.log(`🔑 Admin email detected: "${email}" → using admin data UUID: ${ADMIN_USER_ID}`)
      } else if (isUUID && adminUUIDs.includes(user_identifier)) {
        // If it's an admin UUID, use the admin data UUID
        final_user_id = ADMIN_USER_ID
        console.log(`🔑 Admin UUID detected: "${user_identifier}" → using admin data UUID: ${ADMIN_USER_ID}`)
      } else if (isUUID) {
        final_user_id = user_identifier
      } else if (adminPatterns.includes(user_identifier)) {
        // Use admin ID for known admin patterns
        final_user_id = ADMIN_USER_ID
        console.log(`🔑 Admin pattern detected: "${user_identifier}" → using admin UUID: ${ADMIN_USER_ID}`)
      } else {
        // Create a deterministic UUID from the user identifier
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(user_identifier).digest('hex');
        final_user_id = [
          hash.substr(0, 8),
          hash.substr(8, 4), 
          hash.substr(12, 4),
          hash.substr(16, 4),
          hash.substr(20, 12)
        ].join('-');
      }

      const { data: diveLogs, error } = await supabase
        .from('dive_logs')
        .select('*')
        .eq('user_id', final_user_id)
        .order('date', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        return res.status(500).json({ error: error.message })
      }

      // 🚀 Fetch associated images separately to avoid foreign key issues
      const processedDiveLogs = [];
      
      for (const log of diveLogs || []) {
        try {
          // Get images for this dive log
          const { data: images, error: imageError } = await supabase
            .from('dive_log_image')
            .select('*')
            .eq('dive_log_id', log.id)
            .limit(1);
          
          const imageRecord = images?.[0];
          
          if (imageRecord && !imageError) {
            // Generate public URL for image
            const { data: urlData } = supabase.storage
              .from(imageRecord.bucket)
              .getPublicUrl(imageRecord.path);
            
            processedDiveLogs.push({
              ...log,
              imageUrl: urlData.publicUrl,
              imageAnalysis: imageRecord.ai_analysis,
              extractedMetrics: imageRecord.extracted_metrics,
              imageId: imageRecord.id,
              originalFileName: imageRecord.original_filename,
              hasImage: true
            });
          } else {
            processedDiveLogs.push({
              ...log,
              hasImage: false
            });
          }
        } catch (imageErr) {
          console.warn(`⚠️ Could not fetch image for log ${log.id}:`, imageErr);
          processedDiveLogs.push({
            ...log,
            hasImage: false
          });
        }
      }

      console.log(`✅ Found ${processedDiveLogs.length} dive logs for user: ${user_identifier} (UUID: ${final_user_id})`)
      console.log(`📸 Images found: ${processedDiveLogs.filter(log => log.hasImage).length}`)
      
      return res.status(200).json({ 
        diveLogs: processedDiveLogs,
        stats: {
          totalLogs: processedDiveLogs.length,
          logsWithImages: processedDiveLogs.filter(log => log.hasImage).length,
          logsWithExtractedMetrics: processedDiveLogs.filter(log => log.extractedMetrics && Object.keys(log.extractedMetrics).length > 0).length
        }
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
