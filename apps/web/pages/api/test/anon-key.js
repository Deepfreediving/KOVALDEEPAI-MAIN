/**
 * Test endpoint using anon key instead of service role
 */
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('🔧 Testing with ANON key:')
  console.log('URL:', SUPABASE_URL)
  console.log('Anon Key (first 50 chars):', SUPABASE_ANON_KEY?.substring(0, 50))
  
  const results = {
    url: SUPABASE_URL,
    anonKeyTest: null,
    canReadDiveLogs: false,
    canCheckAuth: false,
    error: null,
    timestamp: new Date().toISOString()
  }
  
  try {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Test basic connection
    const { data, error } = await anonClient.from('dive_logs').select('id').limit(1)
    
    if (error) {
      results.error = error.message
      results.anonKeyTest = 'FAILED'
      console.log('❌ Anon key error:', error.message)
    } else {
      results.anonKeyTest = 'SUCCESS'
      results.canReadDiveLogs = true
      console.log('✅ Anon key works for dive_logs')
    }
    
    // Test auth session
    const { data: authData, error: authError } = await anonClient.auth.getSession()
    if (!authError) {
      results.canCheckAuth = true
      console.log('✅ Anon key works for auth')
    }
    
  } catch (err) {
    results.error = err.message
    results.anonKeyTest = 'EXCEPTION'
    console.log('❌ Anon key exception:', err.message)
  }
  
  return res.status(200).json(results)
}
