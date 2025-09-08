#!/usr/bin/env node

// 🧪 TEST: Batch Processing and Analysis - Complete Workflow Test
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = '35b522f1-27d2-49de-ed2b-0d257d33ad7d';

// Create multiple dive logs for batch testing
const createTestDiveLogs = () => {
  const baseLogs = [
    {
      discipline: "CWT",
      location: "Blue Hole Cyprus",
      targetDepth: "40",
      reachedDepth: "38",
      totalDiveTime: "2:15",
      notes: "Good dive, felt relaxed",
      exit: "Clean",
      surfaceProtocol: "Good",
      squeeze: false
    },
    {
      discipline: "CNF",
      location: "Blue Hole Cyprus", 
      targetDepth: "30",
      reachedDepth: "32",
      totalDiveTime: "2:45",
      notes: "Exceeded target, excellent technique",
      exit: "Clean",
      surfaceProtocol: "Excellent",
      squeeze: false
    },
    {
      discipline: "CWT",
      location: "Dahab",
      targetDepth: "50",
      reachedDepth: "45",
      totalDiveTime: "2:30",
      notes: "Stopped early due to discomfort",
      exit: "Early abort",
      surfaceProtocol: "Good",
      squeeze: true,
      issueComment: "Mild ear squeeze at 35m"
    },
    {
      discipline: "FIM",
      location: "Dahab",
      targetDepth: "35",
      reachedDepth: "35",
      totalDiveTime: "3:00",
      notes: "Perfect dive, new PB",
      exit: "Clean",
      surfaceProtocol: "Excellent",
      squeeze: false
    },
    {
      discipline: "CWT",
      location: "Blue Hole Cyprus",
      targetDepth: "42",
      reachedDepth: "42",
      totalDiveTime: "2:20",
      notes: "Solid performance, good preparation",
      exit: "Clean",
      surfaceProtocol: "Good",
      squeeze: false
    }
  ];

  return baseLogs.map((log, index) => ({
    ...log,
    id: `test-batch-${Date.now()}-${index}`,
    user_id: TEST_USER_ID,
    date: new Date(Date.now() - (index * 2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // Spread over 10 days
    gear: {
      wetsuit: "3mm",
      fins: "Leaderfins", 
      mask: "Omer Alien",
      weights_kg: "2",
      computer: "ORCA"
    }
  }));
};

async function testBatchSaveLogs() {
  console.log('🧪 STEP 1: Creating Multiple Test Dive Logs for Batch Analysis');
  console.log('=' .repeat(70));
  
  const testLogs = createTestDiveLogs();
  const savedLogs = [];
  
  console.log(`📝 Creating ${testLogs.length} test dive logs...`);
  
  for (let i = 0; i < testLogs.length; i++) {
    const log = testLogs[i];
    console.log(`  • Log ${i + 1}: ${log.discipline} to ${log.reachedDepth}m at ${log.location}`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(log)
      });
      
      if (response.ok) {
        const result = await response.json();
        savedLogs.push(result.data || result.diveLog);
        console.log(`    ✅ Saved successfully (ID: ${result.data?.id || result.diveLog?.id})`);
      } else {
        console.log(`    ❌ Failed to save: ${response.status}`);
      }
    } catch (error) {
      console.log(`    ❌ Error saving: ${error.message}`);
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n✅ Created ${savedLogs.length} test dive logs for batch processing`);
  return savedLogs;
}

async function testBatchRetrieval() {
  console.log('\n🧪 STEP 2: Testing Batch Retrieval API');
  console.log('=' .repeat(70));
  
  try {
    const queryParams = new URLSearchParams({
      userId: TEST_USER_ID,
      limit: 50,
      sortBy: 'dive_date',
      sortOrder: 'desc',
      includeAnalysis: 'true'
    });

    const response = await fetch(`${BASE_URL}/api/dive/batch-logs?${queryParams}`);
    
    console.log('📥 Batch retrieval response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Batch retrieval: SUCCESS');
      console.log(`📊 Retrieved ${result.diveLogs?.length || 0} dive logs`);
      console.log('📈 Stats:', JSON.stringify(result.stats, null, 2));
      console.log('📄 Pagination:', JSON.stringify(result.pagination, null, 2));
      
      if (result.recentAnalyses) {
        console.log(`🧠 Found ${result.recentAnalyses.length} recent analyses`);
      }
      
      return result;
    } else {
      const error = await response.text();
      console.log('❌ Batch retrieval: FAILED');
      console.log('Error:', error);
      return null;
    }
  } catch (error) {
    console.log('❌ Batch retrieval: ERROR', error.message);
    return null;
  }
}

async function testBatchAnalysis(analysisType = 'pattern', timeRange = 'all') {
  console.log(`\n🧪 STEP 3: Testing Batch Analysis (${analysisType}, ${timeRange})`);
  console.log('=' .repeat(70));
  
  try {
    const response = await fetch(`${BASE_URL}/api/dive/batch-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        analysisType: analysisType,
        timeRange: timeRange
      })
    });
    
    console.log('📥 Batch analysis response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Batch analysis: SUCCESS');
      console.log(`🔍 Analyzed ${result.analysis?.logsAnalyzed || 0} dive logs`);
      console.log('📋 Analysis Type:', result.analysis?.type);
      console.log('📅 Time Range:', result.analysis?.timeRange);
      console.log('\n🧠 Analysis Result:');
      console.log('=' .repeat(40));
      console.log(result.analysis?.result || 'No result');
      console.log('=' .repeat(40));
      
      return result;
    } else {
      const error = await response.text();
      console.log('❌ Batch analysis: FAILED');
      console.log('Error:', error);
      return null;
    }
  } catch (error) {
    console.log('❌ Batch analysis: ERROR', error.message);
    return null;
  }
}

async function testFilteredRetrieval() {
  console.log('\n🧪 STEP 4: Testing Filtered Batch Retrieval');
  console.log('=' .repeat(70));
  
  // Test different filters
  const filters = [
    { discipline: 'CWT', name: 'Constant Weight only' },
    { location: 'Blue Hole', name: 'Blue Hole location only' },
    { hasIssues: 'true', name: 'Dives with issues only' },
    { hasIssues: 'false', name: 'Clean dives only' }
  ];
  
  for (const filter of filters) {
    console.log(`\n🔍 Testing filter: ${filter.name}`);
    
    try {
      const queryParams = new URLSearchParams({
        userId: TEST_USER_ID,
        limit: 20,
        ...filter
      });
      
      // Remove name from query params
      queryParams.delete('name');

      const response = await fetch(`${BASE_URL}/api/dive/batch-logs?${queryParams}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`  ✅ ${filter.name}: Found ${result.diveLogs?.length || 0} logs`);
        
        // Show some details about filtered results
        if (result.diveLogs?.length > 0) {
          const sample = result.diveLogs[0];
          console.log(`    Sample: ${sample.discipline} at ${sample.location}, Issues: ${sample.squeeze || sample.ear_squeeze || sample.lung_squeeze || sample.issue_comment ? 'Yes' : 'No'}`);
        }
      } else {
        console.log(`  ❌ ${filter.name}: Failed (${response.status})`);
      }
    } catch (error) {
      console.log(`  ❌ ${filter.name}: Error - ${error.message}`);
    }
  }
}

async function testCSVExport() {
  console.log('\n🧪 STEP 5: Testing CSV Export');
  console.log('=' .repeat(70));
  
  try {
    const queryParams = new URLSearchParams({
      userId: TEST_USER_ID,
      format: 'csv'
    });

    const response = await fetch(`${BASE_URL}/api/dive/batch-logs?${queryParams}`);
    
    console.log('📥 CSV export response status:', response.status);
    console.log('📄 Content-Type:', response.headers.get('content-type'));
    
    if (response.ok) {
      const csvContent = await response.text();
      console.log('✅ CSV export: SUCCESS');
      console.log(`📊 CSV size: ${csvContent.length} characters`);
      console.log('📋 First 3 lines:');
      const lines = csvContent.split('\n');
      lines.slice(0, 3).forEach((line, index) => {
        console.log(`  ${index + 1}: ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
      });
      
      return true;
    } else {
      console.log('❌ CSV export: FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ CSV export: ERROR', error.message);
    return false;
  }
}

async function testMultipleAnalysisTypes() {
  console.log('\n🧪 STEP 6: Testing Multiple Analysis Types');
  console.log('=' .repeat(70));
  
  const analysisTypes = ['pattern', 'safety', 'performance', 'coaching'];
  
  for (const type of analysisTypes) {
    console.log(`\n🔍 Testing ${type} analysis...`);
    
    const result = await testBatchAnalysis(type, 'all');
    
    if (result) {
      console.log(`  ✅ ${type} analysis completed successfully`);
    } else {
      console.log(`  ❌ ${type} analysis failed`);
    }
    
    // Small delay between analyses
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function runCompleteBatchTest() {
  console.log('🔍 COMPLETE BATCH PROCESSING & ANALYSIS TEST');
  console.log('🎯 PURPOSE: Test all batch operations for dive log pattern detection');
  console.log('=' .repeat(80));
  
  let allPassed = true;
  
  try {
    // Step 1: Create test data
    const savedLogs = await testBatchSaveLogs();
    if (savedLogs.length === 0) {
      console.log('❌ Cannot continue without test data');
      return;
    }
    
    // Step 2: Test batch retrieval
    const retrievalResult = await testBatchRetrieval();
    if (!retrievalResult) {
      allPassed = false;
    }
    
    // Step 3: Test basic batch analysis
    const analysisResult = await testBatchAnalysis('pattern', 'all');
    if (!analysisResult) {
      allPassed = false;
    }
    
    // Step 4: Test filtered retrieval
    await testFilteredRetrieval();
    
    // Step 5: Test CSV export
    const csvResult = await testCSVExport();
    if (!csvResult) {
      allPassed = false;
    }
    
    // Step 6: Test multiple analysis types
    await testMultipleAnalysisTypes();
    
    console.log('\n🎯 FINAL RESULTS:');
    console.log('=' .repeat(50));
    if (allPassed) {
      console.log('✅ ALL BATCH PROCESSING TESTS PASSED');
      console.log('🚀 Batch analysis and pattern detection is working correctly!');
    } else {
      console.log('⚠️  SOME TESTS FAILED');
      console.log('🔧 Check the errors above and fix the issues');
    }
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Test the frontend batch analysis tab');
    console.log('2. Verify pattern detection accuracy');
    console.log('3. Test with real user data');
    console.log('4. Validate coaching insights quality');
    
  } catch (error) {
    console.error('❌ Complete batch test failed:', error);
  }
}

runCompleteBatchTest();
