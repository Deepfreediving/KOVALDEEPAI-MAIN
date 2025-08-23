// Supabase user profile API endpoint
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  try {
    const { method } = req

    if (method === 'GET') {
      const { userId, nickname } = req.query
      const user_id = userId || nickname || 'anonymous'

      // Get user profile from app_user table
      const { data: profile, error } = await supabase
        .from('app_user')
        .select('*')
        .eq('id', user_id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Supabase profile error:', error)
        return res.status(500).json({ error: error.message })
      }

      // If no profile exists, create a basic anonymous profile
      if (!profile) {
        return res.status(200).json({
          profile: {
            id: user_id,
            nickname: nickname || 'Anonymous User',
            displayName: nickname || 'Anonymous User',
            email: null,
            isAnonymous: true
          }
        })
      }

      return res.status(200).json({ profile })
    }

    if (method === 'POST') {
      const { userId, email, displayName, settings } = req.body
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' })
      }

      // Upsert user profile
      const { data, error } = await supabase
        .from('app_user')
        .upsert([
          {
            id: userId,
            email,
            display_name: displayName,
            settings: settings || {}
          }
        ])
        .select()

      if (error) {
        console.error('Supabase profile save error:', error)
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ 
        success: true, 
        profile: data[0] 
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Profile API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
