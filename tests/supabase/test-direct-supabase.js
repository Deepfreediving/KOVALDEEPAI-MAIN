const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Generate UUID helper function
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

async function testDirectSupabaseWorkflow() {
  console.log('🔥 Testing direct Supabase workflow...\n');

  try {
    // 1. Create an image record directly
    const imageId = generateUUID();
    const diveLogId = generateUUID();
    
    const imageData = {
      id: imageId,
      user_id: ADMIN_USER_ID,
      dive_log_id: null, // Will link after dive log is created
      bucket: 'dive-images',
      path: `dive-images/${ADMIN_USER_ID}/${imageId}`,
      original_filename: 'test-dive-computer.jpg',
      file_size: 1024000,
      mime_type: 'image/jpeg',
      ai_analysis: {
        type: 'dive_computer_display',
        confidence: 0.95,
        text_extracted: 'Max Depth: 95m'
      },
      extracted_metrics: {
        max_depth: 95,
        dive_time_seconds: 240,
        temperature: 24.5
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📸 Creating image record...');
    const { data: imageRecord, error: imageError } = await supabase
      .from('dive_log_image')
      .insert(imageData)
      .select()
      .single();

    if (imageError) {
      console.error('❌ Failed to create image record:', imageError);
      return;
    }

    console.log(`✅ Image record created: ${imageRecord.id}`);

    // 2. Create dive log
    const diveLogData = {
      id: diveLogId,
      user_id: ADMIN_USER_ID,
      date: '2021-07-01',
      discipline: 'Constant Weight',
      location: 'Test Location',
      target_depth: 95,
      reached_depth: 95,
      total_dive_time: '4:00',
      attempt_type: 'Training',
      notes: 'Test dive with image',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        imageId: imageRecord.id,
        extractedFromImage: true
      }
    };

    console.log('📝 Creating dive log...');
    const { data: diveLogRecord, error: diveLogError } = await supabase
      .from('dive_logs')
      .insert(diveLogData)
      .select()
      .single();

    if (diveLogError) {
      console.error('❌ Failed to create dive log:', diveLogError);
      return;
    }

    console.log(`✅ Dive log created: ${diveLogRecord.id}`);

    // 3. Link image to dive log
    console.log('🔗 Linking image to dive log...');
    const { error: linkError } = await supabase
      .from('dive_log_image')
      .update({ dive_log_id: diveLogRecord.id })
      .eq('id', imageRecord.id);

    if (linkError) {
      console.error('❌ Failed to link image to dive log:', linkError);
      return;
    }

    console.log('✅ Image successfully linked to dive log');

    // 4. Verify the relationship
    console.log('\n🔍 Verifying the relationship...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('dive_logs')
      .select(`
        id,
        date,
        location,
        reached_depth,
        dive_log_image (
          id,
          original_filename,
          ai_analysis,
          extracted_metrics
        )
      `)
      .eq('id', diveLogRecord.id)
      .single();

    if (verifyError) {
      console.error('❌ Failed to verify relationship:', verifyError);
      return;
    }

    console.log('📊 Verification result:');
    console.log(`   Dive Log: ${verifyData.date} - ${verifyData.location} - ${verifyData.reached_depth}m`);
    
    if (verifyData.dive_log_image && verifyData.dive_log_image.length > 0) {
      const image = verifyData.dive_log_image[0];
      console.log(`   ✅ Linked Image: ${image.original_filename}`);
      console.log(`   🤖 AI Analysis: ${!!image.ai_analysis}`);
      console.log(`   📊 Extracted Metrics: ${!!image.extracted_metrics}`);
    } else {
      console.log('   ❌ No linked images found');
    }

    console.log('\n🎉 Direct Supabase workflow test completed successfully!');

  } catch (error) {
    console.error('❌ Error during direct workflow test:', error);
  }
}

testDirectSupabaseWorkflow();
