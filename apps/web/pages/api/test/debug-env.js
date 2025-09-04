export default function handler(req, res) {
  console.log('=== ENVIRONMENT DEBUG ===');
  
  const envVars = {
    SERVICE_KEY: process.env.SERVICE_KEY,
    KOVALAISERVICEROLEKEY: process.env.KOVALAISERVICEROLEKEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  
  const result = {
    environmentVariables: Object.keys(envVars).reduce((acc, key) => {
      acc[key] = envVars[key] ? `${envVars[key].substring(0, 20)}...` : 'MISSING';
      return acc;
    }, {}),
    rawValues: envVars,
    customKeyExists: !!process.env.KOVALAISERVICEROLEKEY,
    standardKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    keyPriority: process.env.SERVICE_KEY || process.env.KOVALAISERVICEROLEKEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'NO KEY',
  };
  
  console.log('Environment debug:', result);
  
  res.status(200).json(result);
}
