const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkDiveLogSchema() {
  console.log('🔍 Checking dive_log table columns...\n');

  try {
    // Try a simple select to see what columns exist
    const { data, error } = await supabase
      .from('dive_log')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('📋 Available columns in dive_log table:');
      Object.keys(data[0]).forEach(col => {
        console.log(`   - ${col}`);
      });
    } else {
      console.log('📋 Table exists but no data found');
      
      // Try to get column info differently
      const { data: testInsert, error: insertError } = await supabase
        .from('dive_log')
        .insert({})
        .select();

      if (insertError) {
        console.log('🔍 Insert error reveals column requirements:', insertError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error during schema check:', error);
  }
}

checkDiveLogSchema();
