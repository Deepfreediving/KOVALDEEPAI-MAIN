export default async function handler(req, res) {
  console.log('=== PROJECT VERIFICATION ===');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Test project health endpoint
  try {
    const healthResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': anonKey
      }
    });
    
    const projectInfo = {
      healthStatus: healthResponse.status,
      healthBody: await healthResponse.text(),
      projectHeaders: Object.fromEntries(healthResponse.headers.entries())
    };
    
    // Test if service_role exists in database
    const roleCheckResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/version`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const roleCheck = {
      status: roleCheckResponse.status,
      body: await roleCheckResponse.text()
    };
    
    // Try to access auth.users with service_role (this requires service_role permissions)
    const usersTestResponse = await fetch(`${supabaseUrl}/rest/v1/auth.users?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });
    
    const usersTest = {
      status: usersTestResponse.status,
      body: await usersTestResponse.text()
    };
    
    // Try different API versions
    const v1Test = await fetch(`${supabaseUrl}/rest/v1/dive_logs?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });
    
    const results = {
      projectInfo,
      roleCheck,
      usersTest,
      v1Test: {
        status: v1Test.status,
        body: await v1Test.text()
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        projectUrl: supabaseUrl,
        keyIssueDate: 'August 28, 2025 (FUTURE DATE - POTENTIAL ISSUE!)'
      }
    };
    
    console.log('Project verification results:', JSON.stringify(results, null, 2));
    res.status(200).json(results);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
