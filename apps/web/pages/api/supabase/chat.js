// Supabase-powered chat API endpoint - ADMIN ONLY
import { createClient } from '@supabase/supabase-js'
import { getServerRequestUrl, getServerRequestHeaders } from '@/lib/vercelAuth';

// Use service key for admin operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  // Set proper CORS headers for API routes
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { method } = req

    if (method === 'POST') {
      const { 
        message, 
        threadId,
        userProfile 
      } = req.body

      // ✅ ADMIN ONLY: Use fixed admin user ID
      const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' // Fixed admin UUID

      console.log(`💬 Chat request for admin user: ${ADMIN_USER_ID}`)

      // Get user's dive logs for context
      const { data: diveLogs } = await supabase
        .from('dive_logs')
        .select('*')
        .eq('user_id', ADMIN_USER_ID)
        .order('date', { ascending: false })
        .limit(10)

      // Get user's assistant memory for context
      const { data: memories } = await supabase
        .from('user_memory')
        .select('*')
        .eq('user_id', ADMIN_USER_ID)
        .order('last_used_at', { ascending: false })
        .limit(5)

      // Forward to main chat API (use relative path for internal calls)
      const chatResponse = await fetch('/api/chat/general', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'KovalAI-Internal'
        },
        body: JSON.stringify({
          message,
          userId: ADMIN_USER_ID,
          nickname: 'Daniel Koval',
          threadId,
          userProfile,
          supabaseContext: {
            diveLogs: diveLogs || [],
            memories: memories || []
          }
        })
      })

      const result = await chatResponse.json()
      return res.status(chatResponse.status).json(result)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Chat API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
