const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables from the root .env.local
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });

console.log('🔍 Testing Supabase Connection...\n');

// Test with anon key first
console.log('1️⃣ Testing with ANON key...');
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Test with service role key
console.log('2️⃣ Testing with SERVICE_ROLE key...');
const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testConnection() {
  try {
    // Test anon key - should work for reading dive_logs if RLS allows
    console.log('\n🧪 Testing ANON key with dive_logs...');
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('dive_logs')
      .select('id')
      .limit(1);
    
    if (anonError) {
      console.log('   ❌ Anon key error:', anonError.message);
    } else {
      console.log('   ✅ Anon key works for reading');
    }

    // Test service role key - should work for writing
    console.log('\n🧪 Testing SERVICE_ROLE key with dive_log_image...');
    const testRecord = {
      user_id: 'test-user-id',
      bucket: 'test-bucket',
      path: 'test-path',
      original_filename: 'test.jpg',
      file_size: 1000,
      mime_type: 'image/jpeg',
      created_at: new Date().toISOString()
    };

    const { data: serviceData, error: serviceError } = await supabaseService
      .from('dive_log_image')
      .insert(testRecord)
      .select()
      .single();

    if (serviceError) {
      console.log('   ❌ Service role error:', serviceError.message);
      console.log('   📋 Error details:', serviceError);
    } else {
      console.log('   ✅ Service role key works! Inserted record:', serviceData.id);
      
      // Clean up test record
      await supabaseService
        .from('dive_log_image')
        .delete()
        .eq('id', serviceData.id);
      console.log('   🧹 Test record cleaned up');
    }

  } catch (error) {
    console.error('💥 Connection test failed:', error.message);
  }
}

testConnection();
