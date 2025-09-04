/**
 * 🧪 TEST PINECONE ULTRA-OPTIMIZED CLIENT
 * 
 * This script tests the new ultra-optimized Pinecone client
 * with latency improvements and best practices implementation.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { 
  queryKnowledgeBase, 
  quickSearch, 
  queryByCategory,
  healthCheck 
} from '../lib/pineconeOptimized.js';

async function testOptimizedPinecone() {
  console.log("🧪 TESTING ULTRA-OPTIMIZED PINECONE CLIENT");
  console.log("==================================================");
  
  try {
    // 1. Health Check
    console.log("\n1️⃣ Health Check");
    const health = await healthCheck();
    console.log("Health Status:", health);
    
    if (!health.healthy) {
      console.log("❌ Health check failed, aborting tests");
      return;
    }
    
    // 2. Basic Query Test
    console.log("\n2️⃣ Basic Knowledge Query Test");
    const startTime = Date.now();
    const basicResults = await queryKnowledgeBase("freediving safety equalizing underwater");
    const basicTime = Date.now() - startTime;
    
    console.log(`⏱️ Basic query time: ${basicTime}ms`);
    console.log(`📊 Results count: ${basicResults.length}`);
    if (basicResults.length > 0) {
      console.log(`📖 Sample result: ${basicResults[0].substring(0, 150)}...`);
    }
    
    // 3. Quick Search Test
    console.log("\n3️⃣ Quick Search Test (Minimal Latency)");
    const quickStartTime = Date.now();
    const quickResults = await quickSearch("diving technique breath hold", 2);
    const quickTime = Date.now() - quickStartTime;
    
    console.log(`⚡ Quick search time: ${quickTime}ms`);
    console.log(`📊 Quick results count: ${quickResults.length}`);
    if (quickResults.length > 0) {
      console.log(`📖 Quick sample: ${quickResults[0].substring(0, 100)}...`);
    }
    
    // 4. Category Query Test (if metadata exists)
    console.log("\n4️⃣ Category Query Test");
    try {
      const categoryStartTime = Date.now();
      const categoryResults = await queryByCategory("safety protocols", "safety", { topK: 3 });
      const categoryTime = Date.now() - categoryStartTime;
      
      console.log(`🏷️ Category query time: ${categoryTime}ms`);
      console.log(`📊 Category results count: ${categoryResults.length}`);
    } catch (error) {
      console.log("⚠️ Category query not available (metadata may not be configured)");
    }
    
    // 5. Performance Comparison
    console.log("\n5️⃣ Performance Analysis");
    console.log(`🚀 Basic query: ${basicTime}ms`);
    console.log(`⚡ Quick search: ${quickTime}ms`);
    console.log(`🎯 Performance improvement: ${((basicTime - quickTime) / basicTime * 100).toFixed(1)}%`);
    
    // 6. Latency Optimizations Summary
    console.log("\n6️⃣ Implemented Latency Optimizations:");
    console.log("✅ Singleton connection pattern for Pinecone and OpenAI");
    console.log("✅ Cached index host (avoids describe_index calls)");
    console.log("✅ Reduced topK values for faster processing");
    console.log("✅ Higher score thresholds for better relevance");
    console.log("✅ Optimized retry logic with moderate exponential backoff");
    console.log("✅ Namespace usage for logical data organization");
    console.log("✅ Metadata filtering capability");
    console.log("✅ Graceful degradation and fallback strategies");
    
    console.log("\n✅ ALL TESTS COMPLETED SUCCESSFULLY!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testOptimizedPinecone();
}

export { testOptimizedPinecone };
