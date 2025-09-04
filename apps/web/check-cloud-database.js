const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Checking cloud Supabase database structure...');
console.log('URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey ? 'Present' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  try {
    // Check what tables exist
    console.log('\n📋 Checking existing tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (tablesError) {
      console.error('❌ Error querying tables:', tablesError);
    } else {
      console.log('✅ Tables in database:', tables.map(t => t.table_name));
    }

    // Check if user_profiles table exists and has data
    console.log('\n👤 Checking user_profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Error querying user_profiles:', profilesError);
    } else {
      console.log('✅ User profiles found:', profiles.length);
      if (profiles.length > 0) {
        console.log('   Profiles:', profiles);
      }
    }

    // Check if dive_logs table exists and has data
    console.log('\n🤿 Checking dive_logs table...');
    const { data: logs, error: logsError } = await supabase
      .from('dive_logs')
      .select('id, user_id, date, location')
      .limit(5);
    
    if (logsError) {
      console.error('❌ Error querying dive_logs:', logsError);
    } else {
      console.log('✅ Dive logs found:', logs.length);
      if (logs.length > 0) {
        console.log('   Logs:', logs);
      }
    }

    // Check if dive_log_image table exists
    console.log('\n📸 Checking dive_log_image table...');
    const { data: images, error: imagesError } = await supabase
      .from('dive_log_image')
      .select('id, user_id, dive_log_id')
      .limit(5);
    
    if (imagesError) {
      console.error('❌ Error querying dive_log_image:', imagesError);
    } else {
      console.log('✅ Dive images found:', images.length);
      if (images.length > 0) {
        console.log('   Images:', images);
      }
    }

    // Check auth.users table
    console.log('\n🔐 Checking auth.users table...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error querying auth.users:', usersError);
    } else {
      console.log('✅ Auth users found:', users.users.length);
      users.users.forEach(user => {
        console.log(`   User: ${user.email} (${user.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

checkDatabase();
