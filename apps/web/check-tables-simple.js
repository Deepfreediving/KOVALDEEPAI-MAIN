const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkTablesAndRelationships() {
  console.log('🔍 Checking tables and relationships...\n');

  try {
    // Check dive_logs table
    console.log('📋 Checking dive_logs table...');
    const { data: diveLogs, error: logError } = await supabase
      .from('dive_logs')
      .select('id, date, location, reached_depth, discipline, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (logError) {
      console.error('❌ Error fetching dive_logs:', logError);
    } else {
      console.log(`✅ Found ${diveLogs.length} dive logs`);
      if (diveLogs.length > 0) {
        console.log(`   Most recent: ${diveLogs[0].date} - ${diveLogs[0].location} - ${diveLogs[0].reached_depth}`);
        console.log(`   Log ID for testing: ${diveLogs[0].id}`);
      }
    }

    // Check dive_log_image table
    console.log('\n📸 Checking dive_log_image table...');
    const { data: images, error: imageError } = await supabase
      .from('dive_log_image')
      .select('id, original_filename, dive_log_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (imageError) {
      console.error('❌ Error fetching dive_log_image:', imageError);
    } else {
      console.log(`✅ Found ${images.length} images`);
      if (images.length > 0) {
        console.log(`   Most recent: ${images[0].original_filename}`);
        console.log(`   Links to dive_log_id: ${images[0].dive_log_id}`);
      }
    }

    // Check if any images link to existing dive logs
    if (diveLogs.length > 0 && images.length > 0) {
      console.log('\n🔗 Checking relationships...');
      const diveLogIds = new Set(diveLogs.map(log => log.id));
      const linkedImages = images.filter(img => diveLogIds.has(img.dive_log_id));
      console.log(`   ${linkedImages.length} images properly linked to existing dive logs`);
      
      if (linkedImages.length === 0) {
        console.log('   ⚠️  No images are linked to existing dive logs');
        console.log('   Available dive log IDs:', Array.from(diveLogIds).slice(0, 3));
        console.log('   Image dive_log_ids:', images.map(img => img.dive_log_id).slice(0, 3));
      }
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

checkTablesAndRelationships();
