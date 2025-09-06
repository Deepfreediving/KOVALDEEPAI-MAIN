// Supabase-powered chat API endpoint - ADMIN ONLY
import { createClient } from '@supabase/supabase-js'

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

      // ✅ Handle user ID from request or use test user
      let userId = req.body.userId || req.headers['x-user-id'];
      
      // 🚀 FALLBACK: Use test user ID if none provided (for testing)
      if (!userId) {
        console.warn('⚠️ No user ID provided, using test user ID for development');
        userId = 'test-user-development-only';
      }

      console.log(`💬 Chat request for user: ${userId}`)

      // Get user's dive logs for context
      const { data: diveLogs } = await supabase
        .from('dive_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(10)

      // Get user's assistant memory for context
      const { data: memories } = await supabase
        .from('user_memory')
        .select('*')
        .eq('user_id', userId)
        .order('last_used_at', { ascending: false })
        .limit(5)

      // Forward to main chat API using proper internal URL construction
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || 'kovaldeepai-main.vercel.app';
      const baseUrl = `${protocol}://${host}`;
      
      const chatResponse = await fetch(`${baseUrl}/api/chat/general`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'KovalAI-Internal',
          'x-forwarded-for': req.headers['x-forwarded-for'] || ''
        },
        body: JSON.stringify({
          message,
          userId: userId,
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
