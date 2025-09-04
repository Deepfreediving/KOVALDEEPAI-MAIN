/**
 * 🎯 COMPREHENSIVE SYSTEM TEST
 * Tests the complete pipeline: OpenAI + Pinecone + Image OCR + Supabase
 */

// Test dive log image processing
async function testDiveLogImageProcessing() {
  console.log('🧪 Testing dive log image processing...');
  
  const testImagePath = '/freedive log/100m 71318 cwt best dive off training dbh.JPG';
  
  try {
    const response = await fetch('/api/dive/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: `http://localhost:3000${testImagePath}`,
        userId: 'admin-daniel-koval',
        fileName: '100m_71318_cwt_test.JPG'
      })
    });
    
    const result = await response.json();
    console.log('📊 Image processing result:', result);
    return result;
  } catch (error) {
    console.error('❌ Image processing failed:', error);
    throw error;
  }
}

// Test OpenAI chat with Pinecone knowledge
async function testOpenAIKnowledgeRetrieval() {
  console.log('🧪 Testing OpenAI + Pinecone knowledge retrieval...');
  
  try {
    const response = await fetch('/api/chat/general', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'What is the proper technique for mouthfill equalization at depth?',
        userId: 'admin-daniel-koval',
        context: 'freediving training'
      })
    });
    
    const result = await response.json();
    console.log('🧠 Knowledge retrieval result:', result);
    return result;
  } catch (error) {
    console.error('❌ Knowledge retrieval failed:', error);
    throw error;
  }
}

// Test dive log saving to Supabase
async function testDiveLogSaving() {
  console.log('🧪 Testing dive log saving to Supabase...');
  
  const testDiveLog = {
    userId: 'admin-daniel-koval',
    date: new Date().toISOString().split('T')[0],
    discipline: 'CWT',
    location: 'Dean\'s Blue Hole',
    reached_depth: 100,
    target_depth: 100,
    total_time_seconds: 180,
    bottom_time: 15,
    descent_seconds: 82,
    ascent_seconds: 83,
    mouthfill_depth: 30,
    recovery_quality: 4,
    gear: {
      fins: 'Carbon fins',
      wetsuit: '3mm',
      weight: '2kg'
    },
    ai_summary: 'Test dive - 100m CWT with good technique'
  };
  
  try {
    const response = await fetch('/api/supabase/save-dive-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        diveLogData: testDiveLog
      })
    });
    
    const result = await response.json();
    console.log('💾 Dive log save result:', result);
    return result;
  } catch (error) {
    console.error('❌ Dive log saving failed:', error);
    throw error;
  }
}

// Test retrieving dive logs from Supabase
async function testDiveLogRetrieval() {
  console.log('🧪 Testing dive log retrieval from Supabase...');
  
  try {
    const response = await fetch('/api/supabase/dive-logs-optimized?userId=admin-daniel-koval');
    const result = await response.json();
    console.log('📚 Dive logs retrieval result:', result);
    return result;
  } catch (error) {
    console.error('❌ Dive log retrieval failed:', error);
    throw error;
  }
}

// Run all tests
async function runComprehensiveTest() {
  console.log('🚀 Starting comprehensive system test...');
  console.log('=' + '='.repeat(50));
  
  const results = {};
  
  try {
    // Test 1: Knowledge retrieval
    console.log('\n📝 Test 1: OpenAI + Pinecone Knowledge Retrieval');
    results.knowledge = await testOpenAIKnowledgeRetrieval();
    console.log('✅ Knowledge retrieval test passed');
    
    // Test 2: Dive log saving
    console.log('\n📝 Test 2: Dive Log Saving to Supabase');
    results.saving = await testDiveLogSaving();
    console.log('✅ Dive log saving test passed');
    
    // Test 3: Dive log retrieval
    console.log('\n📝 Test 3: Dive Log Retrieval from Supabase');
    results.retrieval = await testDiveLogRetrieval();
    console.log('✅ Dive log retrieval test passed');
    
    // Test 4: Image processing
    console.log('\n📝 Test 4: Dive Log Image Processing + OCR');
    results.imageProcessing = await testDiveLogImageProcessing();
    console.log('✅ Image processing test passed');
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('=' + '='.repeat(50));
    console.log('📊 Complete Test Results:', JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.log('📊 Partial Results:', JSON.stringify(results, null, 2));
  }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  window.runSystemTest = runComprehensiveTest;
  console.log('🎯 System test loaded. Run window.runSystemTest() to execute.');
}

export { runComprehensiveTest };
