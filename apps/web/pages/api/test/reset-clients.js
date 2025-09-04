import { resetClients, getAdminClient } from '@/lib/supabase/index'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Reset the cached clients
    resetClients()
    
    // Get a fresh admin client
    const supabase = getAdminClient()
    
    // Test the client with a simple query
    const { data, error } = await supabase
      .from('dive_logs')
      .select('count')
      .limit(1)

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: 'Client test failed',
        details: error.message 
      })
    }

    res.status(200).json({ 
      success: true, 
      message: 'Clients reset and tested successfully',
      testResult: data 
    })

  } catch (error) {
    console.error('Reset error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Reset failed',
      details: error.message 
    })
  }
}
