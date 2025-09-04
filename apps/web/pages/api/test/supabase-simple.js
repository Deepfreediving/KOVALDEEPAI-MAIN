/**
 * 🧪 SIMPLE SUPABASE TEST - No TypeScript types
 * 
 * This endpoint tests Supabase connection without complex types
 * to isolate any type-related issues
 */

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  console.log('🧪 Simple Supabase test starting...')
  
  // Get environment variables directly
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log('🔧 Environment check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!serviceRoleKey,
    urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING',
    keyPreview: serviceRoleKey ? serviceRoleKey.substring(0, 30) + '...' : 'MISSING'
  })
  
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error: 'Missing environment variables',
      hasUrl: !!supabaseUrl,
      hasKey: !!serviceRoleKey
    })
  }
  
  try {
    // Create client without types
    console.log('🔑 Creating simple Supabase client...')
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    console.log('✅ Client created, attempting query...')
    
    // Try a simple query
    const { data, error } = await supabase
      .from('dive_logs')
      .select('*')
      .limit(1)
    
    console.log('📊 Query result:', {
      hasData: !!data,
      dataLength: data?.length || 0,
      error: error?.message || 'none',
      errorCode: error?.code,
      errorDetails: error?.details,
      fullError: error
    })
    
    if (error) {
      return res.status(500).json({
        error: 'Supabase query failed',
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
    }
    
    return res.status(200).json({
      success: true,
      message: 'Supabase connection successful',
      dataLength: data?.length || 0,
      data: data || []
    })
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return res.status(500).json({
      error: 'Unexpected error',
      message: error.message,
      stack: error.stack
    })
  }
}
