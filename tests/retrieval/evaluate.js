/**
 * 🎯 RETRIEVAL QUALITY EVALUATION HARNESS
 * 
 * Tests query performance and tracks regression
 */

const fs = require('fs').promises;
const path = require('path');

async function evaluateRetrieval() {
  console.log('🎯 Starting Retrieval Quality Evaluation');
  console.log('========================================\n');
  
  // Load test queries
  const csvPath = path.join(__dirname, 'queries.csv');
  const csvContent = await fs.readFile(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  
  const testCases = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/"/g, ''));
    return {
      query: values[0],
      expectedCategory: values[1],
      mustTerms: values[2].split('|'),
      canonicalExpected: values[3] === 'true'
    };
  });
  
  console.log(`📊 Loaded ${testCases.length} test cases`);
  
  let totalTests = 0;
  let passed = 0;
  let categoryMatches = 0;
  let mustTermMatches = 0;
  let canonicalMatches = 0;
  
  const results = [];
  
  for (const testCase of testCases) {
    totalTests++;
    console.log(`\n🔍 Testing: "${testCase.query}"`);
    
    try {
      // Simulate API call to test endpoint
      const response = await fetch('http://localhost:3000/api/pinecone/pineconequery-gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: testCase.query,
          returnChunks: true
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      // Evaluate results
      const hasChunks = data.chunks && data.chunks.length > 0;
      let categoryMatch = false;
      let mustTermMatch = false;
      let canonicalMatch = false;
      
      if (hasChunks) {
        // Check if any chunk contains must-have terms
        const firstChunk = data.chunks[0].toLowerCase();
        mustTermMatch = testCase.mustTerms.some(term => 
          firstChunk.includes(term.toLowerCase())
        );
        
        // Check category (would need metadata from actual response)
        // categoryMatch = data.metadata?.[0]?.category === testCase.expectedCategory;
        
        // Check canonical (would need metadata from actual response)
        // canonicalMatch = data.metadata?.[0]?.canonical === testCase.canonicalExpected;
        
        // For now, use simplified scoring
        mustTermMatch = testCase.mustTerms.some(term => 
          firstChunk.includes(term.toLowerCase())
        );
      }
      
      const testPassed = hasChunks && mustTermMatch;
      
      if (testPassed) passed++;
      if (mustTermMatch) mustTermMatches++;
      
      const result = {
        query: testCase.query,
        passed: testPassed,
        hasResults: hasChunks,
        mustTermMatch,
        categoryMatch,
        canonicalMatch,
        score: data.scores?.[0] || 0,
        processingTime: data.processingTime || 0
      };
      
      results.push(result);
      
      console.log(`   ✅ Has results: ${hasChunks}`);
      console.log(`   🎯 Must terms: ${mustTermMatch ? '✅' : '❌'}`);
      console.log(`   ⭐ Score: ${result.score?.toFixed(3) || 'N/A'}`);
      console.log(`   ⏱️  Time: ${result.processingTime}ms`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({
        query: testCase.query,
        passed: false,
        error: error.message
      });
    }
  }
  
  // Calculate metrics
  const hitRate = (passed / totalTests) * 100;
  const mustTermRate = (mustTermMatches / totalTests) * 100;
  const avgProcessingTime = results
    .filter(r => r.processingTime)
    .reduce((sum, r) => sum + r.processingTime, 0) / results.length;
  
  console.log('\n📈 EVALUATION RESULTS');
  console.log('====================');
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passed} (${hitRate.toFixed(1)}%)`);
  console.log(`Must-term matches: ${mustTermMatches} (${mustTermRate.toFixed(1)}%)`);
  console.log(`Average processing time: ${avgProcessingTime.toFixed(0)}ms`);
  
  // Save detailed results
  const reportPath = path.join(__dirname, 'evaluation-report.json');
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      passed,
      hitRate,
      mustTermRate,
      avgProcessingTime
    },
    results
  }, null, 2));
  
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  
  // Alert on regression (if hit rate < 80%)
  if (hitRate < 80) {
    console.log('\n🚨 REGRESSION ALERT: Hit rate below 80%!');
  } else {
    console.log('\n✅ Quality metrics within acceptable range');
  }
  
  return {
    hitRate,
    mustTermRate,
    avgProcessingTime
  };
}

// Run if called directly
if (require.main === module) {
  evaluateRetrieval().catch(console.error);
}

module.exports = { evaluateRetrieval };
