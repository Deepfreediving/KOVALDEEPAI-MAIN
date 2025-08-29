#!/usr/bin/env node

/**
 * Image Upload Test
 * Tests the image upload API to see what's failing
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const LOCALHOST_URL = 'http://localhost:3000';
const PRODUCTION_URL = 'https://kovaldeepai-main.vercel.app';

console.log('📸 Image Upload API Test');
console.log('========================');

async function testImageUpload() {
  console.log('1️⃣ Testing image upload API endpoint availability...');
  
  try {
    // Test if the API endpoint exists
    const { stdout: localResponse } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" -X POST "${LOCALHOST_URL}/api/openai/upload-dive-image-simple"`);
    
    console.log(`📡 Local API status: ${localResponse.trim()}`);
    if (localResponse.trim() === '400') {
      console.log('✅ Local API endpoint exists (400 = missing image file, expected)');
    } else if (localResponse.trim() === '405') {
      console.log('❌ Local API endpoint not found or method not allowed');
    }
    
  } catch (error) {
    console.error('❌ Local API test error:', error.message);
  }
  
  console.log('\n2️⃣ Testing production API endpoint...');
  
  try {
    const { stdout: prodResponse } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" -X POST "${PRODUCTION_URL}/api/openai/upload-dive-image-simple"`);
    
    console.log(`📡 Production API status: ${prodResponse.trim()}`);
    if (prodResponse.trim() === '400') {
      console.log('✅ Production API endpoint exists (400 = missing image file, expected)');
    } else if (prodResponse.trim() === '405') {
      console.log('❌ Production API endpoint not found or method not allowed');
    }
    
  } catch (error) {
    console.error('❌ Production API test error:', error.message);
  }
  
  console.log('\n3️⃣ Checking environment variables...');
  
  // Check if .env.local has required variables
  try {
    const { stdout: envCheck } = await execAsync('grep -E "OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY" apps/web/.env.local | wc -l');
    const envCount = parseInt(envCheck.trim());
    
    if (envCount >= 2) {
      console.log('✅ Required environment variables found in .env.local');
    } else {
      console.log('❌ Missing environment variables in .env.local');
    }
    
  } catch (error) {
    console.error('❌ Environment check error:', error.message);
  }
  
  console.log('\n4️⃣ Common image upload issues:');
  console.log('   📋 Missing OPENAI_API_KEY - API calls will fail');
  console.log('   📋 Missing SUPABASE_SERVICE_ROLE_KEY - Database saves will fail');
  console.log('   📋 Supabase storage bucket not configured');
  console.log('   📋 dive_log_image table missing or misconfigured');
  console.log('   📋 File size/type restrictions');
  console.log('   📋 Network/CORS issues');
  
  console.log('\n5️⃣ To debug further:');
  console.log('   🔍 Check browser dev tools Network tab for actual error');
  console.log('   🔍 Check Vercel function logs for server errors');
  console.log('   🔍 Test with a small (< 1MB) JPEG image');
  console.log('   🔍 Verify Supabase storage bucket exists and is accessible');
  
  console.log('\n🎯 Expected behavior:');
  console.log('   📸 Upload image → OpenAI analysis → Save to Supabase → Return data');
  console.log('   ❌ Current: Upload failing → Warning message shown');
  
  return true;
}

// Run the test
testImageUpload()
  .then(() => {
    console.log('\n✨ Image upload test completed!');
    console.log('🔧 Next: Check browser dev tools or Vercel logs for specific error details.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });
