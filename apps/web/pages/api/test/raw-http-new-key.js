export default async function handler(req, res) {
  const serviceKey = process.env.SERVICE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  console.log('Testing raw HTTP with new service key...');
  console.log('Using key:', serviceKey ? `${serviceKey.substring(0, 20)}...` : 'MISSING');
  
  try {
    // Test raw HTTP request like curl
    const response = await fetch(`${url}/rest/v1/dive_logs?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const responseText = await response.text();
    
    const result = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: responseText,
      headers: Object.fromEntries(response.headers.entries()),
      keyUsed: serviceKey ? `${serviceKey.substring(0, 20)}...` : 'MISSING'
    };
    
    console.log('Raw HTTP result:', result);
    res.status(200).json(result);
    
  } catch (error) {
    console.error('Raw HTTP error:', error);
    res.status(500).json({ 
      error: error.message,
      keyUsed: serviceKey ? `${serviceKey.substring(0, 20)}...` : 'MISSING'
    });
  }
}
