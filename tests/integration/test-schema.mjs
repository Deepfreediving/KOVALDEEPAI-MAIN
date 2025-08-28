import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve('apps/web/.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
  try {
    console.log('🔍 Checking dive_logs table schema...');
    
    // Try to get one record to see the structure
    const { data, error } = await supabase
      .from('dive_logs')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Sample data structure:', data);
      if (data.length > 0) {
        console.log('Column names:', Object.keys(data[0]));
      } else {
        console.log('No data found, but table exists');
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkSchema();
