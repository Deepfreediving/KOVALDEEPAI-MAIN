// Delete dive log API endpoint - ADMIN ONLY
import { getAdminSupabaseClient } from '@/lib/supabaseServerClient'

// Use admin client for delete operations
const supabase = getAdminSupabaseClient();

export default async function handler(req, res) {
  try {
    const { method } = req

    if (method === 'DELETE') {
      const { logId } = req.body

      // ✅ ADMIN ONLY: Use fixed admin user ID
      const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' // Fixed admin UUID

      if (!logId) {
        return res.status(400).json({ error: 'logId is required' })
      }

      console.log(`🗑️ Deleting dive log ${logId} for admin user: ${ADMIN_USER_ID}`)

      // Delete dive log from Supabase (correct table name: dive_logs)
      const { error } = await supabase
        .from('dive_logs')
        .delete()
        .eq('id', logId)
        .eq('user_id', ADMIN_USER_ID)

      if (error) {
        console.error('Supabase delete error:', error)
        return res.status(500).json({ error: error.message })
      }

      console.log('✅ Dive log deleted from Supabase:', logId)
      return res.status(200).json({ 
        success: true, 
        message: 'Dive log deleted successfully'
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
