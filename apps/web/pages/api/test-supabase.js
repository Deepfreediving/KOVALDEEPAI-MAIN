// Simple Supabase test endpoint without TypeScript complications
const { createClient } = require('@supabase/supabase-js')

export default async function handler(req, res) {
  try {
    console.log('🧪 Testing Supabase connection directly...')
    
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('Environment check:', {
      SUPABASE_URL: SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
    })
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Missing environment variables' })
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    console.log('🔍 Attempting simple dive_logs query...')
    const { data, error } = await supabase
      .from('dive_logs')
      .select('*')
      .limit(1)
    
    console.log('Query result:', { 
      hasData: !!data, 
      dataLength: data?.length || 0, 
      error: error?.message || 'none',
      fullError: error
    })
    
    if (error) {
      return res.status(500).json({ 
        error: 'Supabase query failed',
        details: error.message,
        supabaseError: error
      })
    }
    
    return res.status(200).json({
      success: true,
      message: 'Supabase connection working',
      data: data,
      count: data?.length || 0
    })
    
  } catch (err) {
    console.error('Test endpoint error:', err)
    return res.status(500).json({
      error: 'Test failed',
      details: err.message
    })
  }
}
