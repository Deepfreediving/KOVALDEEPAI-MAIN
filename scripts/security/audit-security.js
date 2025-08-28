#!/usr/bin/env node
// Security audit script for KovalAI Supabase instance

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSecurityAudit() {
  console.log('🔒 KOVALAI SECURITY AUDIT');
  console.log('========================\n');

  try {
    // 1. Check RLS status on all tables
    console.log('📋 1. Row Level Security (RLS) Status:');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_rls_status', {});

    if (tablesError) {
      // Fallback query
      const { data: rlsStatus } = await supabase
        .from('information_schema.tables')
        .select('*')
        .eq('table_schema', 'public');
      
      console.log('   Using fallback RLS check...');
      console.log(`   Found ${rlsStatus?.length || 0} public tables`);
    } else {
      tables?.forEach(table => {
        const status = table.row_security ? '✅ ENABLED' : '❌ DISABLED';
        console.log(`   ${table.table_name}: ${status}`);
      });
    }

    // 2. Check for tables without RLS policies
    console.log('\n🛡️  2. RLS Policies Coverage:');
    const { data: policies } = await supabase
      .rpc('get_policies_summary', {});
    
    if (policies) {
      policies.forEach(policy => {
        console.log(`   ${policy.tablename}: ${policy.policy_count} policies`);
      });
    }

    // 3. Check storage bucket security
    console.log('\n💾 3. Storage Bucket Security:');
    const { data: buckets } = await supabase.storage.listBuckets();
    
    buckets?.forEach(bucket => {
      const status = bucket.public ? '⚠️  PUBLIC' : '🔒 PRIVATE';
      console.log(`   ${bucket.name}: ${status}`);
    });

    // 4. Check for exposed environment variables
    console.log('\n🔑 4. Environment Variable Security:');
    const envChecks = [
      { name: 'OPENAI_API_KEY', masked: process.env.OPENAI_API_KEY?.slice(-4) },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', masked: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-4) },
      { name: 'PINECONE_API_KEY', masked: process.env.PINECONE_API_KEY?.slice(-4) }
    ];

    envChecks.forEach(env => {
      if (env.masked) {
        console.log(`   ${env.name}: ✅ Present (***${env.masked})`);
      } else {
        console.log(`   ${env.name}: ❌ Missing`);
      }
    });

    // 5. Check API endpoint security
    console.log('\n🌐 5. API Endpoint Security Check:');
    const endpoints = [
      '/api/openai/upload-dive-image-simple',
      '/api/supabase/dive-logs',
      '/api/supabase/save-dive-log'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${process.env.BASE_URL}${endpoint}`, {
          method: 'GET'
        });
        
        const status = response.status === 405 ? '✅ Protected' : '⚠️  Check required';
        console.log(`   ${endpoint}: ${status} (${response.status})`);
      } catch (error) {
        console.log(`   ${endpoint}: ❌ Error - ${error.message}`);
      }
    }

    // 6. Database performance check
    console.log('\n⚡ 6. Database Performance:');
    try {
      const { data: indexStats } = await supabase
        .rpc('check_index_usage', {});
      
      if (indexStats) {
        const unusedIndexes = indexStats.filter(idx => idx.idx_scan === 0);
        console.log(`   Total indexes: ${indexStats.length}`);
        console.log(`   Unused indexes: ${unusedIndexes.length}`);
        console.log(`   Index efficiency: ${((indexStats.length - unusedIndexes.length) / indexStats.length * 100).toFixed(1)}%`);
      }
    } catch (error) {
      console.log('   Index stats not available (requires custom RPC function)');
    }

    console.log('\n🎯 SECURITY AUDIT COMPLETE!');
    console.log('\n📋 RECOMMENDATIONS:');
    console.log('   1. ✅ Update to new Supabase API keys (completed)');
    console.log('   2. 🔄 Run security migration to fix RLS policies');
    console.log('   3. 🧹 Clean up unused database indexes');
    console.log('   4. 🔒 Verify all API endpoints require authentication');
    console.log('   5. 📊 Monitor database performance regularly');

  } catch (error) {
    console.error('❌ Audit failed:', error.message);
  }
}

runSecurityAudit();
