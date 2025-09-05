// Simple API connectivity test
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function quickTest() {
  console.log('🔍 Quick API Environment Test\n');
  
  // Test 1: OpenAI API Key format
  const openaiKey = process.env.OPENAI_API_KEY;
  console.log('OpenAI API Key:', openaiKey ? '✅ SET (length: ' + openaiKey.length + ')' : '❌ MISSING');
  
  // Test 2: Supabase URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  console.log('Supabase URL:', supabaseUrl ? '✅ SET (' + supabaseUrl + ')' : '❌ MISSING');
  
  // Test 3: Pinecone configuration
  const pineconeKey = process.env.PINECONE_API_KEY;
  const pineconeHost = process.env.PINECONE_HOST;
  console.log('Pinecone API Key:', pineconeKey ? '✅ SET (length: ' + pineconeKey.length + ')' : '❌ MISSING');
  console.log('Pinecone Host:', pineconeHost ? '✅ SET (' + pineconeHost + ')' : '❌ MISSING');
  
  // Test 4: PayPal configuration
  const paypalClientId = process.env.PAYPAL_CLIENT_ID;
  const paypalSecret = process.env.PAYPAL_CLIENT_SECRET;
  console.log('PayPal Client ID:', paypalClientId ? '✅ SET (length: ' + paypalClientId.length + ')' : '❌ MISSING');
  console.log('PayPal Secret:', paypalSecret ? '✅ SET (length: ' + paypalSecret.length + ')' : '❌ MISSING');
  
  // Test 5: Basic HTTP request to check internet connectivity
  console.log('\n🌐 Testing basic connectivity...');
  try {
    const response = await fetch('https://httpbin.org/status/200');
    console.log('Internet connectivity:', response.ok ? '✅ Connected' : '❌ Failed');
  } catch (error) {
    console.log('Internet connectivity: ❌ Failed -', error.message);
  }
  
  console.log('\n✅ Environment variables test complete!');
}

quickTest().catch(console.error);
