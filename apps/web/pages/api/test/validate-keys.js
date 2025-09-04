/**
 * Test endpoint to validate Supabase API keys
 */
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SERVICE_KEY || process.env.KOVALAISERVICEROLEKEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log('🔧 Testing API Keys:')
  console.log('URL:', SUPABASE_URL)
  console.log('Anon Key (first 50 chars):', SUPABASE_ANON_KEY?.substring(0, 50))
  console.log('Service Role Key (first 50 chars):', SUPABASE_SERVICE_ROLE_KEY?.substring(0, 50))
  
  const results = {
    url: SUPABASE_URL,
    anonKeyValid: false,
    serviceRoleKeyValid: false,
    anonError: null,
    serviceRoleError: null,
    timestamp: new Date().toISOString()
  }
  
  // Test anon key
  try {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await anonClient.from('dive_logs').select('id').limit(1)
    
    if (error) {
      results.anonError = error.message
      console.log('❌ Anon key error:', error.message)
    } else {
      results.anonKeyValid = true
      console.log('✅ Anon key works, found records:', data?.length || 0)
    }
  } catch (err) {
    results.anonError = err.message
    console.log('❌ Anon key exception:', err.message)
  }
  
  // Test service role key
  try {
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data, error } = await serviceClient.from('dive_logs').select('id').limit(1)
    
    if (error) {
      results.serviceRoleError = error.message
      console.log('❌ Service role key error:', error.message)
    } else {
      results.serviceRoleKeyValid = true
      console.log('✅ Service role key works, found records:', data?.length || 0)
    }
  } catch (err) {
    results.serviceRoleError = err.message
    console.log('❌ Service role key exception:', err.message)
  }
  
  return res.status(200).json(results)
}
