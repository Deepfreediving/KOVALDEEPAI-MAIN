// Supabase dive logs API endpoint
import { getServerSupabaseClient } from '@/lib/supabaseServerClient'

const supabase = getServerSupabaseClient();

export default async function handler(req, res) {
  try {
    const { method } = req

    if (method === 'GET') {
      // Get user's dive logs (support both authenticated and anonymous users)
      const { nickname, userId } = req.query
      const user_identifier = userId || nickname || 'anonymous'

      // ✅ ADMIN FALLBACK: If user_identifier matches admin patterns, use admin ID directly
      const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const adminPatterns = ['daniel_koval', 'Daniel Koval', 'daniel@deepfreediving.com', 'danielkoval@example.com']
      
      let final_user_id;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_identifier)
      
      if (isUUID) {
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

      console.log(`✅ Found ${diveLogs?.length || 0} dive logs for user: ${user_identifier} (UUID: ${final_user_id})`)
      return res.status(200).json({ diveLogs: diveLogs || [] })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
