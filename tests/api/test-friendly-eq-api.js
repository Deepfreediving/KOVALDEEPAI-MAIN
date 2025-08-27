// Test the new friendly EQ API approach
const calculateEQPlan = require('./apps/web/pages/api/coach/eq-plan.js').default;

console.log('🧪 TESTING FRIENDLY EQ PLAN API');
console.log('==================================================\n');

// Test the calculateEQPlan function directly
function testCalculateEQPlan(targetDepth, maxReversePack = null, experience = 'beginner') {
  // Import the function from the file
  const fs = require('fs');
  const path = require('path');
  
  const eqPlanFile = fs.readFileSync(
    path.join(__dirname, 'apps/web/pages/api/coach/eq-plan.js'), 
    'utf8'
  );
  
  // Extract the calculateEQPlan function
  const funcStart = eqPlanFile.indexOf('function calculateEQPlan');
  const funcEnd = eqPlanFile.indexOf('export default async function');
  const funcCode = eqPlanFile.substring(funcStart, funcEnd);
  
  // Evaluate the function
  eval(funcCode);
  
  return calculateEQPlan(targetDepth, maxReversePack, experience);
}

// Test 1: No reverse pack depth - should be friendly and educational
console.log('📚 Test 1: No Reverse Pack Data (Should Provide Friendly Guidance)');
console.log('Input: targetDepth = 50m, no reverse pack data');
const result1 = testCalculateEQPlan(50);
console.log('Result:');
console.log('✅ Friendly approach:', result1.needsReversePack ? 'YES' : 'NO');
console.log('📖 Educational content:', !!result1.explanation ? 'YES' : 'NO');
console.log('🎯 Guidance provided:', !!result1.testProtocol ? 'YES' : 'NO');
console.log('💡 Quick estimate:', !!result1.quickEstimate ? 'YES' : 'NO');
console.log('Message:', result1.message);
console.log('');

// Test 2: With reverse pack depth - should work normally
console.log('✅ Test 2: With Reverse Pack Data (Should Work Normally)');
console.log('Input: targetDepth = 50m, maxReversePack = 45m');
const result2 = testCalculateEQPlan(50, 45, 'intermediate');
console.log('Result:');
console.log('✅ Has mouthfill plan:', !!result2.mouthfillDepth ? 'YES' : 'NO');
console.log('📊 Mouthfill depth:', result2.mouthfillDepth + 'm');
console.log('🎯 Volume recommendation:', result2.volumeRecommendation?.size || 'N/A');
console.log('');

// Test 3: Shallow reverse pack - should still be encouraging
console.log('🆘 Test 3: Shallow Reverse Pack (Should Encourage Training)');
console.log('Input: targetDepth = 40m, maxReversePack = 25m (needs training)');
const result3 = testCalculateEQPlan(40, 25, 'beginner');
console.log('Result:');
console.log('⚠️ Needs flexibility training:', result3.needsFlexibilityTraining ? 'YES' : 'NO');
console.log('📊 Mouthfill depth:', result3.mouthfillDepth + 'm');
console.log('💪 Training notes included:', result3.notes?.some(note => note.includes('flexibility')) ? 'YES' : 'NO');
console.log('');

console.log('==================================================');
console.log('🎯 NEW USER EXPERIENCE:');
console.log('• No harsh errors - friendly guidance instead');
console.log('• Educational content explains why reverse pack matters');
console.log('• Clear instructions for testing reverse pack depth');
console.log('• Quick conservative estimate while they learn');
console.log('• Encouraging tone throughout');
console.log('• Still maintains Daniel\'s exact methodology when data available');
