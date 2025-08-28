#!/usr/bin/env node

// Quick test to verify the performance optimizations are working
// Tests the actual database performance improvements

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPerformanceOptimizations() {
  console.log('🧪 Testing Database Performance Optimizations\n')
  
  const testUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' // Admin user
  
  try {
    // Test 1: Check if the optimized view exists and works
    console.log('📊 Test 1: Optimized View Performance')
    const viewStart = Date.now()
    
    const { data: viewData, error: viewError } = await supabase
      .from('v_dive_logs_with_images')
      .select('*')
      .eq('user_id', testUserId)
      .limit(10)
    
    const viewTime = Date.now() - viewStart
    
    if (viewError) {
      console.log(`   ❌ View test failed: ${viewError.message}`)
    } else {
      console.log(`   ✅ View query successful: ${viewTime}ms`)
      console.log(`   📋 Records returned: ${viewData?.length || 0}`)
      console.log(`   📸 With images: ${viewData?.filter(d => d.has_image).length || 0}`)
    }
    
    // Test 2: Test the regular dive_logs table performance  
    console.log('\n📊 Test 2: Direct Table Performance')
    const tableStart = Date.now()
    
    const { data: tableData, error: tableError } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', testUserId)
      .order('date', { ascending: false })
      .limit(10)
    
    const tableTime = Date.now() - tableStart
    
    if (tableError) {
      console.log(`   ❌ Table test failed: ${tableError.message}`)
    } else {
      console.log(`   ✅ Table query successful: ${tableTime}ms`)
      console.log(`   📋 Records returned: ${tableData?.length || 0}`)
    }
    
    // Test 3: Test concurrent requests (load test)
    console.log('\n🚀 Test 3: Concurrent Load Test')
    const concurrentStart = Date.now()
    
    const concurrentPromises = Array.from({ length: 5 }, () =>
      supabase
        .from('v_dive_logs_with_images')
        .select('*')
        .eq('user_id', testUserId)
        .limit(5)
    )
    
    const results = await Promise.allSettled(concurrentPromises)
    const concurrentTime = Date.now() - concurrentStart
    
    const successful = results.filter(r => r.status === 'fulfilled').length
    console.log(`   ✅ Successful concurrent requests: ${successful}/5`)
    console.log(`   ⏱️  Total time for 5 concurrent: ${concurrentTime}ms`)
    console.log(`   📊 Average per request: ${Math.round(concurrentTime / 5)}ms`)
    
    // Test 4: Check if indexes are being used
    console.log('\n🔍 Test 4: Index Usage Check')
    
    const { data: indexData, error: indexError } = await supabase
      .rpc('sql', {
        query: `
          SELECT schemaname, tablename, indexname 
          FROM pg_indexes 
          WHERE schemaname = 'public' 
            AND (indexname LIKE '%_perf' OR indexname LIKE '%_final')
          ORDER BY tablename, indexname;
        `
      })
    
    if (indexError) {
      console.log(`   ❌ Index check failed: ${indexError.message}`)
    } else {
      console.log(`   ✅ Performance indexes found: ${indexData?.length || 0}`)
      indexData?.forEach(idx => {
        console.log(`   📊 ${idx.tablename}.${idx.indexname}`)
      })
    }
    
    // Summary
    console.log('\n📋 Performance Test Summary')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    if (viewTime < 1000 && successful >= 4) {
      console.log('🎉 PERFORMANCE OPTIMIZATION SUCCESS!')
      console.log('   ✅ Fast view queries (< 1s)')
      console.log('   ✅ Concurrent requests handled well')
      console.log('   ✅ ERR_INSUFFICIENT_RESOURCES likely resolved')
    } else if (viewTime < 3000) {
      console.log('⚠️  MODERATE IMPROVEMENT')
      console.log('   ✅ Better than before, but could be faster')
      console.log('   ⚠️  May still have some resource pressure')
    } else {
      console.log('❌ PERFORMANCE STILL POOR')
      console.log('   ❌ Slow queries (> 3s)')
      console.log('   ❌ ERR_INSUFFICIENT_RESOURCES may persist')
    }
    
  } catch (error) {
    console.log(`❌ Test failed with error: ${error.message}`)
  }
}

testPerformanceOptimizations()
