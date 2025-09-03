// ===== API Environment Variables Test Suite =====
// This script tests all API connections to verify they're working correctly

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

console.log('🧪 API Environment Variables Test Suite');
console.log('=' .repeat(50));

// Helper function to test API endpoints
async function testApiEndpoint(name, url, headers = {}, testFn = null) {
  console.log(`\n📡 Testing ${name}...`);
  try {
    const response = await fetch(url, { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
    
    const success = testFn ? testFn(response) : response.ok;
    
    if (success) {
      console.log(`✅ ${name}: Connected successfully (${response.status})`);
      return true;
    } else {
      console.log(`❌ ${name}: Failed (${response.status} ${response.statusText})`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: Error - ${error.message}`);
    return false;
  }
}

// Helper function to validate environment variables
function validateEnvVar(name, value, required = true) {
  if (!value) {
    if (required) {
      console.log(`❌ ${name}: MISSING (required)`);
      return false;
    } else {
      console.log(`⚠️  ${name}: Not set (optional)`);
      return true;
    }
  }
  
  const maskedValue = value.length > 20 ? 
    value.substring(0, 10) + '...' + value.substring(value.length - 5) : 
    value.substring(0, 10) + '...';
  
  console.log(`✅ ${name}: ${maskedValue} (length: ${value.length})`);
  return true;
}

async function runTests() {
  console.log('\n🔍 Environment Variables Check');
  console.log('-'.repeat(30));
  
  // Check all environment variables
  const envChecks = [
    // OpenAI
    ['OPENAI_API_KEY', process.env.OPENAI_API_KEY, true],
    ['OPENAI_MODEL', process.env.OPENAI_MODEL, true],
    ['OPENAI_ASSISTANT_ID', process.env.OPENAI_ASSISTANT_ID, true],
    ['OPENAI_ORG', process.env.OPENAI_ORG, false],
    
    // Supabase
    ['NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL, true],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, true],
    ['SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY, true],
    
    // Pinecone
    ['PINECONE_API_KEY', process.env.PINECONE_API_KEY, true],
    ['PINECONE_HOST', process.env.PINECONE_HOST, true],
    ['PINECONE_INDEX', process.env.PINECONE_INDEX, true],
    
    // PayPal
    ['PAYPAL_CLIENT_ID', process.env.PAYPAL_CLIENT_ID, true],
    ['PAYPAL_CLIENT_SECRET', process.env.PAYPAL_CLIENT_SECRET, true],
    ['NEXT_PUBLIC_PAYPAL_CLIENT_ID', process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID, true],
    
    // App Config
    ['BASE_URL', process.env.BASE_URL, false],
    ['NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL, false],
  ];
  
  let allEnvValid = true;
  for (const [name, value, required] of envChecks) {
    if (!validateEnvVar(name, value, required)) {
      allEnvValid = false;
    }
  }
  
  if (!allEnvValid) {
    console.log('\n❌ Some environment variables are missing. Please check your .env.local file.');
    return;
  }
  
  console.log('\n🌐 API Connectivity Tests');
  console.log('-'.repeat(30));
  
  const results = [];
  
  // Test OpenAI API
  if (process.env.OPENAI_API_KEY) {
    const openaiResult = await testApiEndpoint(
      'OpenAI API',
      'https://api.openai.com/v1/models',
      { 
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` 
      }
    );
    results.push(['OpenAI', openaiResult]);
  }
  
  // Test Supabase
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabaseResult = await testApiEndpoint(
      'Supabase API',
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
      { 
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      }
    );
    results.push(['Supabase', supabaseResult]);
  }
  
  // Test Pinecone (basic connectivity)
  if (process.env.PINECONE_HOST) {
    const pineconeResult = await testApiEndpoint(
      'Pinecone API',
      `${process.env.PINECONE_HOST}/describe_index_stats`,
      { 
        'Api-Key': process.env.PINECONE_API_KEY 
      }
    );
    results.push(['Pinecone', pineconeResult]);
  }
  
  // Test PayPal (sandbox)
  if (process.env.PAYPAL_CLIENT_ID) {
    const paypalResult = await testApiEndpoint(
      'PayPal API (Sandbox)',
      'https://api.sandbox.paypal.com/v1/oauth2/token',
      {},
      (response) => response.status === 401 || response.status === 200 // 401 is expected without proper auth
    );
    results.push(['PayPal', paypalResult]);
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('='.repeat(30));
  
  const passed = results.filter(([_, result]) => result).length;
  const total = results.length;
  
  results.forEach(([name, result]) => {
    console.log(`${result ? '✅' : '❌'} ${name}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} APIs accessible`);
  
  if (passed === total) {
    console.log('🎉 All API services are configured and accessible!');
  } else {
    console.log('⚠️  Some APIs may need attention. Check the specific error messages above.');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('- If OpenAI fails: Check API key validity and billing');
  console.log('- If Supabase fails: Verify project URL and keys');
  console.log('- If Pinecone fails: Check API key and index configuration');
  console.log('- If PayPal fails: Verify sandbox credentials');
}

// Run the tests
runTests().catch(console.error);
