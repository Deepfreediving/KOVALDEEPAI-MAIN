#!/usr/bin/env node

// Check what values are actually in the database from successful saves
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bhbwxupjlkpbxnnmvqmm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ No Supabase key found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExistingEnumValues() {
  console.log('🔍 Checking Existing Database Values');
  console.log('=' .repeat(50));
  
  try {
    // Get a sample of existing logs to see what enum values are actually used
    const { data: logs, error } = await supabase
      .from('dive_logs')
      .select('discipline, surface_protocol, exit_protocol, attempt_type')
      .limit(20);
    
    if (error) {
      console.error('❌ Error fetching logs:', error);
      return;
    }
    
    console.log(`📊 Found ${logs.length} existing logs`);
    
    // Extract unique values for each enum field
    const disciplines = [...new Set(logs.map(log => log.discipline).filter(Boolean))];
    const surfaceProtocols = [...new Set(logs.map(log => log.surface_protocol).filter(Boolean))];
    const exitProtocols = [...new Set(logs.map(log => log.exit_protocol).filter(Boolean))];
    const attemptTypes = [...new Set(logs.map(log => log.attempt_type).filter(Boolean))];
    
    console.log('\n🎯 Unique Values Found:');
    console.log('Disciplines:', disciplines);
    console.log('Surface Protocols:', surfaceProtocols);
    console.log('Exit Protocols:', exitProtocols);
    console.log('Attempt Types:', attemptTypes);
    
    // Test with NULL values (which should always work)
    console.log('\n🧪 Testing with NULL enum values...');
    
    const testData = {
      id: `null-test-${Date.now()}`,
      user_id: '35b522f1-27d2-49de-ed2b-0d257d33ad7d',
      date: new Date().toISOString().split('T')[0],
      discipline: null,
      location: "Test Location",
      target_depth: 50,
      reached_depth: 48,
      total_dive_time: 150,
      surface_protocol: null,
      exit_protocol: null,
      attempt_type: null,
      notes: "Testing with NULL values"
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('dive_logs')
      .insert(testData)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ NULL test failed:', insertError);
    } else {
      console.log('✅ NULL test succeeded - basic insert works');
      console.log('Inserted log ID:', insertResult.id);
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

checkExistingEnumValues();
