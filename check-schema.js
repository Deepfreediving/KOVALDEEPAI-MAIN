// Check dive_logs table schema
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableSchema() {
  console.log('🔍 Checking dive_logs table schema...');
  
  try {
    // Try to get any existing row to see the structure
    const { data, error } = await supabase
      .from('dive_logs')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Found existing row, columns:');
      console.log(Object.keys(data[0]));
    } else {
      console.log('No existing rows, trying to insert a test row to see schema...');
      
      // Try a minimal insert to see what columns are expected
      const { data: insertData, error: insertError } = await supabase
        .from('dive_logs')
        .insert({
          user_id: '123e4567-e89b-12d3-a456-426614174000'
        })
        .select();
        
      if (insertError) {
        console.log('Insert error (this helps us see expected columns):');
        console.log(insertError);
      } else {
        console.log('✅ Minimal insert successful:', insertData);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTableSchema();
