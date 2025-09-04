export default function handler(req, res) {
  console.log('=== COMPLETE ENVIRONMENT DEBUG ===');
  
  const allEnvVars = {
    SERVICE_KEY: process.env.SERVICE_KEY,
    KOVALAISERVICEROLEKEY: process.env.KOVALAISERVICEROLEKEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  
  // Test which key the Supabase client is actually using
  const actualKey = process.env.SERVICE_KEY || process.env.KOVALAISERVICEROLEKEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  console.log('All environment variables:', allEnvVars);
  console.log('Resolved service key:', actualKey);
  
  // Return safe values
  const response = {
    SERVICE_KEY: allEnvVars.SERVICE_KEY ? `${allEnvVars.SERVICE_KEY.substring(0, 20)}...` : 'MISSING',
    KOVALAISERVICEROLEKEY: allEnvVars.KOVALAISERVICEROLEKEY ? `${allEnvVars.KOVALAISERVICEROLEKEY.substring(0, 20)}...` : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: allEnvVars.SUPABASE_SERVICE_ROLE_KEY ? `${allEnvVars.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` : 'MISSING',
    resolvedKey: actualKey ? `${actualKey.substring(0, 20)}...` : 'MISSING',
    isNewFormat: actualKey ? actualKey.startsWith('sb_secret_') : false,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };
  
  res.status(200).json(response);
}
