// Debug environment variables and paths
console.log('=== Environment Variables Debug ===');

const requiredEnvVars = [
  'OPENAI_API_KEY',
  'OPENAI_ASSISTANT_ID', 
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'PINECONE_API_KEY',
  'PINECONE_HOST',
  'PINECONE_INDEX'
];

console.log('Checking required environment variables:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`${varName}: ${value ? 'SET' : 'UNDEFINED'} (length: ${value?.length || 0})`);
});

console.log('\n=== Path Resolution Debug ===');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('Process platform:', process.platform);

console.log('\n=== Node.js Version ===');
console.log('Node version:', process.version);
console.log('NPM version:', process.env.npm_version);

// Check for undefined values that might cause path issues
const potentialPaths = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.VERCEL_URL,
  process.env.NODE_ENV
];

console.log('\n=== Potential Path Variables ===');
potentialPaths.forEach((path, index) => {
  console.log(`Path ${index}: ${path === undefined ? 'UNDEFINED' : path}`);
});
