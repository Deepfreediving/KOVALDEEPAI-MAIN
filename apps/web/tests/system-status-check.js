const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkSystemStatus() {
  console.log('🏊‍♂️ KovalAI Dive Log System Status Check\n');

  try {
    // Check dive logs
    console.log('1. 📋 Checking dive logs...');
    const { data: diveLogs, error: logError } = await supabase
      .from('dive_logs')
      .select('id, date, location, target_depth, reached_depth, discipline')
      .limit(3);

    if (logError) {
      console.error('❌ Dive logs error:', logError);
    } else {
      console.log(`✅ Found ${diveLogs.length} dive logs`);
      diveLogs.forEach(log => {
        console.log(`   📋 ${log.date} - ${log.location} - Target: ${log.target_depth}m, Reached: ${log.reached_depth}m`);
      });
    }

    // Check images
    console.log('\n2. 📸 Checking dive log images...');
    const { data: images, error: imageError } = await supabase
      .from('dive_log_image')
      .select('id, dive_log_id, original_filename, extracted_metrics, ai_analysis')
      .limit(3);

    if (imageError) {
      console.error('❌ Image error:', imageError);
    } else {
      console.log(`✅ Found ${images.length} images`);
      images.forEach(img => {
        console.log(`   📸 ${img.original_filename} - Linked to: ${img.dive_log_id || 'none'} - Has metrics: ${!!img.extracted_metrics}`);
      });
    }

    // Check field mapping
    console.log('\n3. 🔧 Testing field mapping...');
    if (diveLogs && diveLogs.length > 0) {
      const testLog = diveLogs[0];
      const mapped = {
        targetDepth: testLog.target_depth,
        reachedDepth: testLog.reached_depth
      };
      console.log('✅ Database fields:', { target_depth: testLog.target_depth, reached_depth: testLog.reached_depth });
      console.log('✅ Mapped fields:', mapped);
    }

    console.log('\n🎯 DIAGNOSIS:');
    if (diveLogs && diveLogs.length > 0 && diveLogs[0].target_depth > 0) {
      console.log('✅ Dive logs have correct depth data');
    } else {
      console.log('❌ Dive logs missing depth data');
    }

    if (images && images.length > 0) {
      console.log('✅ Images are being stored');
    } else {
      console.log('❌ No images found - image upload pipeline not working');
    }

  } catch (error) {
    console.error('❌ System check error:', error);
  }
}

checkSystemStatus();
