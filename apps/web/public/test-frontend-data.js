// Quick frontend data test - verify dive logs load correctly
async function testFrontendDataLoading() {
  console.log('🧪 Testing Frontend Data Loading...');
  
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  
  try {
    // Test the exact API call the frontend makes
    const response = await fetch(`/api/dive/batch-logs?userId=${userId}&limit=100&sortBy=date&sortOrder=desc&includeAnalysis=true`);
    
    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`API error: ${result.error}`);
    }
    
    console.log(`✅ API Success: ${result.diveLogs.length} dive logs retrieved`);
    
    // Test data transformation like the frontend does
    const transformedLogs = result.diveLogs.map(log => ({
      id: log.id,
      date: log.date,
      discipline: log.discipline,
      location: log.location,
      reachedDepth: log.reached_depth,
      notes: log.notes
    }));
    
    console.log('📊 Transformed Data Sample:');
    console.table(transformedLogs.slice(0, 3));
    
    // Test specific real data points
    const realDataCheck = transformedLogs.some(log => 
      log.reachedDepth === 101.4 && log.discipline === 'FIM'
    );
    
    if (realDataCheck) {
      console.log('✅ Real dive data confirmed (found 101.4m FIM dive)');
    } else {
      console.log('❌ Real dive data not found');
    }
    
    return transformedLogs;
    
  } catch (error) {
    console.error('❌ Frontend data test failed:', error);
    return [];
  }
}

// Run test if in browser context
if (typeof window !== 'undefined') {
  testFrontendDataLoading();
}
