const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });

console.log('🔍 Testing Supabase Connection...\n');

console.log('Environment check:');
console.log('  SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Loaded' : '❌ Missing');
console.log('  SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? `✅ Loaded (${process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 30)}...)` : '❌ Missing');

// Try anon key first since we know it works for reading
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, // Using anon key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testConnection() {
  try {
    console.log('\n� Authenticating as real user...');
    
    // First, we need to authenticate as the real user
    // For testing purposes, we'll temporarily use the service role key to bypass auth
    // In production, the user would be authenticated through the normal auth flow
    
    console.log('\n�🔎 Testing basic connection...');
    
    // Simple query to test connection
    const { data, error, count } = await supabase
      .from('dive_logs')
      .select('id', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.log('❌ Connection failed:', error);
      return false;
    }
    
    console.log('✅ Connection successful!');
    console.log('  Found', count, 'dive logs');
    
    // Test dive_log_image table
    console.log('\n🖼️ Testing dive_log_image table...');
    const { data: imageData, error: imageError, count: imageCount } = await supabase
      .from('dive_log_image')
      .select('id', { count: 'exact' })
      .limit(1);
    
    if (imageError) {
      console.log('❌ dive_log_image table access failed:', imageError);
      return false;
    }
    
    console.log('✅ dive_log_image table accessible!');
    console.log('  Found', imageCount, 'images');
    
    // Test insert capability
    console.log('\n💾 Testing insert permissions...');
    const testRecord = {
      user_id: '98d62ddb-d8ec-41b6-a8cd-77466e5bcfbc', // Real user: daniel@deepfreediving.com
      bucket: 'test-bucket',
      path: 'test-path',
      original_filename: 'test.jpg',
      file_size: 1000,
      mime_type: 'image/jpeg',
      ai_analysis: 'Test analysis',
      extracted_metrics: { test: true },
      ocr_text: 'Test OCR'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('dive_log_image')
      .insert(testRecord)
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ Insert failed:', insertError);
      return false;
    }
    
    console.log('✅ Insert successful! Record ID:', insertData.id);
    
    // Clean up test record
    await supabase.from('dive_log_image').delete().eq('id', insertData.id);
    console.log('✅ Test record cleaned up');
    
    return true;
    
  } catch (error) {
    console.log('❌ Unexpected error:', error);
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('\n🎉 All tests passed! Supabase is working correctly.');
  } else {
    console.log('\n❌ Tests failed. Check your Supabase configuration.');
  }
  process.exit(success ? 0 : 1);
});
