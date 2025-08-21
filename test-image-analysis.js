// Test script to diagnose image analysis issues
const fs = require('fs');
const path = require('path');

async function testImageAnalysis() {
  console.log('🔍 Testing image analysis functionality...');
  
  // Test 1: Check if OpenAI API key is properly set
  console.log('\n1️⃣ Checking OpenAI configuration...');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY environment variable not set');
    return;
  }
  if (!apiKey.startsWith('sk-')) {
    console.error('❌ OPENAI_API_KEY appears to be invalid (should start with sk-)');
    return;
  }
  console.log('✅ OpenAI API key appears to be set correctly');
  
  // Test 2: Check Supabase configuration
  console.log('\n2️⃣ Checking Supabase configuration...');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase configuration missing');
    return;
  }
  console.log('✅ Supabase configuration appears to be set');
  
  // Test 3: Test OpenAI Vision API with a simple request
  console.log('\n3️⃣ Testing OpenAI Vision API...');
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey });
    
    // Create a simple test image (1x1 red pixel)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'This is a test image. Please describe what you see.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${testImageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 100
    });
    
    const analysis = response.choices[0].message.content;
    console.log('✅ OpenAI Vision API working, response:', analysis.substring(0, 100) + '...');
    
  } catch (error) {
    console.error('❌ OpenAI Vision API test failed:', error.message);
    if (error.status) {
      console.error('   Status:', error.status);
    }
    if (error.error?.code) {
      console.error('   Error code:', error.error.code);
    }
    return;
  }
  
  // Test 4: Test Supabase connection with admin client
  console.log('\n4️⃣ Testing Supabase admin connection...');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey || serviceRoleKey === 'YOUR_SERVICE_ROLE_KEY_HERE') {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not properly set');
      return;
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Test basic connection
    const { data, error } = await supabase.from('dive_logs').select('count').limit(1);
    if (error) {
      console.error('❌ Supabase admin connection failed:', error.message);
      return;
    }
    console.log('✅ Supabase admin connection working');
    
    // Test storage bucket
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error('❌ Storage access failed:', bucketError.message);
      return;
    }
    
    const hasDiveImages = buckets.some(bucket => bucket.name === 'dive-images');
    if (hasDiveImages) {
      console.log('✅ dive-images storage bucket exists');
    } else {
      console.warn('⚠️ dive-images storage bucket not found, will be created on first upload');
    }
    
  } catch (error) {
    console.error('❌ Supabase test failed:', error.message);
    return;
  }
  
  console.log('\n🏁 All tests completed! Image analysis should be working.');
}

// Load environment variables from .env.local
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
  console.log('📁 Loaded environment variables from .env.local');
}

testImageAnalysis().catch(console.error);
