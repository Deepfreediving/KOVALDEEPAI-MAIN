#!/usr/bin/env node

// Quick test to verify the extracted_metrics column was added successfully
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSchemaFix() {
  console.log('🧪 Testing if extracted_metrics column was added...\n');

  try {
    // Try to insert a record with extracted_metrics
    const testRecord = {
      user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      bucket: 'test',
      path: 'schema-test-' + Date.now() + '.jpg',
      original_filename: 'schema-test.jpg',
      file_size: 1000,
      mime_type: 'image/jpeg',
      extracted_metrics: {
        test: 'schema_fix_verification',
        max_depth: 25.5,
        dive_time_seconds: 180
      }
    };

    const { data, error } = await supabase
      .from('dive_log_image')
      .insert(testRecord)
      .select()
      .single();

    if (error) {
      if (error.message.includes("extracted_metrics")) {
        console.log('❌ Schema fix failed - extracted_metrics column still missing');
        console.log('Error:', error.message);
        console.log('\n📝 Please run the SQL script in Supabase dashboard:');
        console.log('ALTER TABLE dive_log_image ADD COLUMN extracted_metrics JSONB NULL;');
      } else {
        console.log('❌ Different error occurred:', error.message);
      }
      return false;
    }

    console.log('✅ Schema fix successful!');
    console.log('✅ extracted_metrics column is working');
    console.log('Test record ID:', data.id);

    // Clean up test record
    await supabase
      .from('dive_log_image')
      .delete()
      .eq('id', data.id);

    console.log('✅ Test record cleaned up');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

testSchemaFix().then(success => {
  if (success) {
    console.log('\n🎉 Ready to run the full test with: node test-real-supabase-save.js');
  } else {
    console.log('\n❌ Please fix the schema first, then run this test again');
  }
});
