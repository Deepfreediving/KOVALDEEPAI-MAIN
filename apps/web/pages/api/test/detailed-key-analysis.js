import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  console.log('=== DETAILED KEY ANALYSIS ===');
  
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  
  console.log('Environment variables loaded:');
  console.log('SUPABASE_URL exists:', !!supabaseUrl);
  console.log('SERVICE_ROLE_KEY exists:', !!serviceRoleKey);
  console.log('ANON_KEY exists:', !!anonKey);
  
  const results = {
    environment: {
      supabaseUrl,
      serviceRoleKeyPresent: !!serviceRoleKey,
      anonKeyPresent: !!anonKey,
    },
    serviceRoleAnalysis: {},
    anonAnalysis: {},
    httpTests: {}
  };
  
  // Analyze JWT tokens
  try {
    if (serviceRoleKey) {
      const serviceDecoded = jwt.decode(serviceRoleKey);
      results.serviceRoleAnalysis = {
        header: jwt.decode(serviceRoleKey, { complete: true })?.header,
        payload: serviceDecoded,
        isValid: !!serviceDecoded,
        role: serviceDecoded?.role,
        ref: serviceDecoded?.ref,
        exp: serviceDecoded?.exp ? new Date(serviceDecoded.exp * 1000).toISOString() : null,
        iat: serviceDecoded?.iat ? new Date(serviceDecoded.iat * 1000).toISOString() : null,
      };
    }
    
    if (anonKey) {
      const anonDecoded = jwt.decode(anonKey);
      results.anonAnalysis = {
        header: jwt.decode(anonKey, { complete: true })?.header,
        payload: anonDecoded,
        isValid: !!anonDecoded,
        role: anonDecoded?.role,
        ref: anonDecoded?.ref,
        exp: anonDecoded?.exp ? new Date(anonDecoded.exp * 1000).toISOString() : null,
        iat: anonDecoded?.iat ? new Date(anonDecoded.iat * 1000).toISOString() : null,
      };
    }
  } catch (error) {
    results.jwtAnalysisError = error.message;
  }
  
  // Test HTTP requests with different configurations
  const testConfigurations = [
    {
      name: 'Service Role - Default Headers',
      key: serviceRoleKey,
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Service Role - Minimal Headers',
      key: serviceRoleKey,
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    },
    {
      name: 'Service Role - Only apikey',
      key: serviceRoleKey,
      headers: {
        'apikey': serviceRoleKey
      }
    },
    {
      name: 'Anon - Default Headers',
      key: anonKey,
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      }
    }
  ];
  
  for (const config of testConfigurations) {
    if (!config.key) continue;
    
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/dive_logs?limit=1`, {
        method: 'GET',
        headers: config.headers
      });
      
      const responseText = await response.text();
      
      results.httpTests[config.name] = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
        success: response.ok
      };
    } catch (error) {
      results.httpTests[config.name] = {
        error: error.message,
        success: false
      };
    }
  }
  
  console.log('Results:', JSON.stringify(results, null, 2));
  
  res.status(200).json(results);
}
