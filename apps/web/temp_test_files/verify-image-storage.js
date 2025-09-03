const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function verifyImageStorage() {
  console.log('🔍 Checking dive log images in database...\n');

  try {
    // Check dive logs with their associated images
    const { data: diveLogs, error: logError } = await supabase
      .from('dive_logs')
      .select(`
        id,
        date,
        location,
        reached_depth,
        discipline,
        dive_log_image (
          id,
          original_filename,
          path,
          file_size,
          ai_analysis,
          extracted_metrics,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (logError) {
      console.error('❌ Error fetching dive logs:', logError);
      return;
    }

    console.log(`📊 Found ${diveLogs.length} recent dive logs\n`);

    for (const log of diveLogs) {
      console.log(`📋 Dive Log: ${log.date} - ${log.location} - ${log.reached_depth} ${log.discipline}`);
      
      if (log.dive_log_image && log.dive_log_image.length > 0) {
        for (const image of log.dive_log_image) {
          console.log(`   📸 Image: ${image.original_filename}`);
          console.log(`   📁 Path: ${image.path}`);
          console.log(`   📊 File Size: ${image.file_size} bytes`);
          console.log(`   🤖 Has Analysis: ${!!image.ai_analysis}`);
          console.log(`   📈 Has Metrics: ${!!image.extracted_metrics}`);
          console.log(`   ⏰ Created: ${image.created_at}`);
        }
      } else {
        console.log('   ❌ No images associated');
      }
      console.log('');
    }

    // Check total image count
    const { count: imageCount, error: countError } = await supabase
      .from('dive_log_image')
      .select('id', { count: 'exact' });

    if (!countError) {
      console.log(`📸 Total images in dive_log_image table: ${imageCount}`);
    }

    // Check recent images without dive logs
    const { data: orphanImages, error: orphanError } = await supabase
      .from('dive_log_image')
      .select('id, original_filename, dive_log_id, created_at')
      .is('dive_log_id', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!orphanError && orphanImages.length > 0) {
      console.log(`\n⚠️  Found ${orphanImages.length} images without associated dive logs:`);
      orphanImages.forEach(img => {
        console.log(`   📸 ${img.original_filename} (${img.created_at})`);
      });
    }

    console.log('\n✅ Image storage verification complete!');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

verifyImageStorage();
