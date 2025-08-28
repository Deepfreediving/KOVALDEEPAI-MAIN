const jwt = require('jsonwebtoken');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });

console.log('🔍 Analyzing Supabase JWT Tokens...\n');

function analyzeJWT(token, name) {
  try {
    const decoded = jwt.decode(token, { complete: true });
    console.log(`📋 ${name}:`);
    console.log(`   Issuer: ${decoded.payload.iss}`);
    console.log(`   Role: ${decoded.payload.role}`);
    console.log(`   Project Ref: ${decoded.payload.ref || 'N/A'}`);
    console.log(`   Issued At: ${new Date(decoded.payload.iat * 1000).toISOString()}`);
    console.log(`   Expires At: ${new Date(decoded.payload.exp * 1000).toISOString()}`);
    console.log(`   Is Expired: ${Date.now() > decoded.payload.exp * 1000 ? '❌ YES' : '✅ NO'}`);
    console.log();
  } catch (error) {
    console.log(`❌ Error decoding ${name}:`, error.message);
  }
}

// Analyze anon key
if (process.env.SUPABASE_ANON_KEY) {
  analyzeJWT(process.env.SUPABASE_ANON_KEY, 'ANON KEY');
}

// Analyze service role key
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  analyzeJWT(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SERVICE ROLE KEY');
}

console.log('🔗 Expected Project URL:', process.env.SUPABASE_URL);
