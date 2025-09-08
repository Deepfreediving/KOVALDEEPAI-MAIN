// Quick test to check users table structure and create test user
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Environment check:');
console.log('URL available:', !!supabaseUrl);
console.log('Key available:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersTable() {
  console.log('\n📊 Checking users table structure...');
  
  try {
    // First, let's see what columns exist
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('Error querying users table:', error);
      return;
    }
    
    console.log('✅ Users table accessible');
    console.log('Sample row structure:', data?.[0] ? Object.keys(data[0]) : 'No rows found');
    
    // Try to create a simple test user
    const testUserId = '123e4567-e89b-12d3-a456-426614174000';
    
    console.log('\n🚀 Creating test user...');
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .upsert({
        id: testUserId,
        email: 'test@kovaldeepai.com',
        created_at: new Date().toISOString()
      })
      .select();
      
    if (insertError) {
      console.error('❌ Error creating test user:', insertError);
    } else {
      console.log('✅ Test user created successfully:', insertData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkUsersTable();
