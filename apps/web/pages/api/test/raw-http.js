/**
 * Test endpoint using raw Node.js HTTP instead of Supabase SDK
 */
import https from 'https'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log('🔧 Testing raw HTTP connection:')
  console.log('URL:', SUPABASE_URL)
  console.log('Service Key (first 50 chars):', SUPABASE_SERVICE_ROLE_KEY?.substring(0, 50))
  
  const options = {
    hostname: 'zhlacqhzhwvkmyxsxevv.supabase.co',
    port: 443,
    path: '/rest/v1/dive_logs?select=*&limit=1',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Prefer': 'return=representation'
    }
  }
  
  return new Promise((resolve) => {
    const req_https = https.request(options, (response) => {
      let data = ''
      
      response.on('data', (chunk) => {
        data += chunk
      })
      
      response.on('end', () => {
        console.log('✅ Raw HTTPS response status:', response.statusCode)
        console.log('✅ Raw HTTPS response data:', data)
        
        try {
          const jsonData = JSON.parse(data)
          resolve()
          res.status(200).json({
            success: true,
            statusCode: response.statusCode,
            data: jsonData,
            timestamp: new Date().toISOString()
          })
        } catch (err) {
          resolve()
          res.status(500).json({
            success: false,
            error: 'Failed to parse response',
            rawData: data,
            statusCode: response.statusCode
          })
        }
      })
    })
    
    req_https.on('error', (error) => {
      console.error('❌ Raw HTTPS error:', error.message)
      resolve()
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    })
    
    req_https.end()
  })
}
