/**
 * 🧪 TEST ENHANCED KNOWLEDGE RETRIEVAL SYSTEM
 * 
 * Tests the new knowledge index integration
 */

const { queryPineconeWithIndex, getMicroClarifier } = require('../apps/web/lib/pineconeServiceEnhanced');

async function testEnhancedRetrieval() {
  console.log('🧪 Testing Enhanced Knowledge Retrieval System');
  console.log('==============================================\n');
  
  const testQueries = [
    '4 rules of direct supervision',
    'one up one down',
    'blackout at depth',
    'LMC handling',
    'mouthfill technique',
    'frenzel equalization',
    'what are safety rules'
  ];
  
  for (const query of testQueries) {
    console.log(`🔍 Testing query: "${query}"`);
    console.log('---');
    
    try {
      // Test micro-clarifier first
      const clarifier = getMicroClarifier(query);
      if (clarifier) {
        console.log(`💡 Micro-clarifier: ${clarifier}`);
      }
      
      // Test enhanced query
      const result = await queryPineconeWithIndex(query, {
        topK: 3,
        confidence: 0.85
      });
      
      console.log(`📊 Results: ${result.chunks.length} chunks`);
      console.log(`🎯 Index match: ${result.indexMatch ? result.indexMatch.title : 'None'}`);
      console.log(`📝 Verbatim: ${result.verbatim ? 'Yes' : 'No'}`);
      
      if (result.botMustSay) {
        console.log(`🤖 Bot Must Say: "${result.botMustSay}"`);
      }
      
      if (result.chunks.length > 0) {
        console.log(`📄 First chunk preview: ${result.chunks[0].substring(0, 150)}...`);
        console.log(`⭐ Score: ${result.scores[0]?.toFixed(3)}`);
      }
      
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error testing "${query}":`, error.message);
    }
  }
  
  console.log('✅ Enhanced retrieval system test completed!');
}

// Run if called directly
if (require.main === module) {
  testEnhancedRetrieval().catch(console.error);
}

module.exports = { testEnhancedRetrieval };
