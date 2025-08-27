#!/usr/bin/env node
// Test Supabase connection and dive logs

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseDiveLogs() {
  console.log('🔍 Testing Supabase dive logs connection...\n');
  
  // Initialize Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Using key: ${supabaseKey ? 'Found' : 'Missing'}`);
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase configuration');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test connection by getting all dive logs
  try {
    console.log('\n📊 Querying all dive logs...');
    const { data: allLogs, error: allError } = await supabase
      .from('dive_logs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.log(`❌ Error querying all logs: ${allError.message}`);
    } else {
      console.log(`✅ Total dive logs in database: ${allLogs?.length || 0}`);
      if (allLogs && allLogs.length > 0) {
        console.log('   First few logs:');
        allLogs.slice(0, 3).forEach((log, i) => {
          console.log(`   ${i + 1}. ID: ${log.id}, User: ${log.user_id}, Date: ${log.date}, Location: ${log.location || 'N/A'}`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ Connection error: ${error.message}`);
  }
  
  // Test admin user specifically
  const adminUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  try {
    console.log(`\n👤 Querying dive logs for admin user: ${adminUserId}`);
    const { data: adminLogs, error: adminError } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', adminUserId)
      .order('date', { ascending: false });
    
    if (adminError) {
      console.log(`❌ Error querying admin logs: ${adminError.message}`);
    } else {
      console.log(`✅ Admin dive logs: ${adminLogs?.length || 0}`);
      if (adminLogs && adminLogs.length > 0) {
        console.log('   Admin logs:');
        adminLogs.forEach((log, i) => {
          console.log(`   ${i + 1}. Date: ${log.date}, Location: ${log.location || 'N/A'}, Depth: ${log.reached_depth || 'N/A'}m`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ Admin query error: ${error.message}`);
  }
  
  // Check table structure
  try {
    console.log('\n🏗️ Checking table structure...');
    const { data: tableInfo, error: structError } = await supabase
      .from('dive_logs')
      .select('*')
      .limit(1);
    
    if (structError) {
      console.log(`❌ Structure error: ${structError.message}`);
    } else if (tableInfo && tableInfo.length > 0) {
      console.log('✅ Table structure (sample record):');
      console.log('   Fields:', Object.keys(tableInfo[0]).join(', '));
    } else {
      console.log('⚠️ Table exists but is empty');
    }
  } catch (error) {
    console.log(`❌ Structure check error: ${error.message}`);
  }
  
  console.log('\n✅ Supabase test completed');
}

testSupabaseDiveLogs().catch(console.error);
