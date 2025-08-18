// Supabase dive logs API endpoint
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  try {
    const { method } = req

    if (method === 'GET') {
      // Get user's dive logs (support both authenticated and anonymous users)
      const { nickname, userId } = req.query
      const user_identifier = userId || nickname || 'anonymous'

      // Create deterministic UUID for consistency
      const crypto = require('crypto');
      let final_user_id;
      
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_identifier)
      if (isUUID) {
        final_user_id = user_identifier
      } else {
        // Create a deterministic UUID from the user identifier
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
        .from('dive_log')
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
