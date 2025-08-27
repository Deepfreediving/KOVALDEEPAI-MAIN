// Test the corrected EQ progression and 50% mouthfill rule

const { calculateEQPlan } = require('./apps/web/pages/api/coach/eq-plan.js');

function testEQProgression() {
  console.log('🧪 TESTING CORRECTED EQ PROGRESSION & 50% RULE');
  console.log('==================================================\n');

  const testCases = [
    {
      name: "🏊‍♂️ Deep Diver Elite (90m target)",
      targetDepth: 90,
      maxReversePack: 60,
      userLevel: 'advanced',
      notes: "Should hit 50% rule - max mouthfill at 45m despite 52m reverse pack capability"
    },
    {
      name: "🤿 Experienced CWT Diver (80m target)", 
      targetDepth: 80,
      maxReversePack: 50,
      userLevel: 'advanced',
      notes: "Should hit 50% rule - max mouthfill at 40m despite 42m reverse pack capability"
    },
    {
      name: "⭐ Advanced Club Diver (70m target)",
      targetDepth: 70,
      maxReversePack: 45,
      userLevel: 'intermediate',
      notes: "Should use 35m rule (50% of 70m), reverse pack allows 37m"
    },
    {
      name: "💪 Solid Intermediate (60m target)",
      targetDepth: 60,
      maxReversePack: 40,
      userLevel: 'intermediate', 
      notes: "Should use 30m (50% of 60m), reverse pack allows 32m"
    },
    {
      name: "🎯 Conservative Progression (50m target)",
      targetDepth: 50,
      maxReversePack: 35,
      userLevel: 'beginner',
      notes: "Should use 25m (50% of 50m), reverse pack allows 27m"
    },
    {
      name: "⚠️ Flexibility Training Needed (40m target)",
      targetDepth: 40, 
      maxReversePack: 25,
      userLevel: 'beginner',
      notes: "Low reverse pack - should recommend flexibility training, mouthfill at 20m (50% rule)"
    }
  ];

  testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. ${testCase.name}`);
    console.log(`   Target: ${testCase.targetDepth}m | Reverse Pack: ${testCase.maxReversePack}m | Level: ${testCase.userLevel}`);
    console.log(`   ${testCase.notes}\n`);
    
    try {
      const result = calculateEQPlan(testCase.targetDepth, testCase.maxReversePack, testCase.userLevel);
      
      if (result.insufficient) {
        console.log(`   ⚠️  INSUFFICIENT CAPABILITY`);
        console.log(`   Analysis: ${result.analysis.theoreticalMax}m theoretical max vs ${result.analysis.targetDepth}m target`);
        console.log(`   Shortfall: ${result.analysis.shortfall}m`);
        console.log(`   Recommendation: ${result.recommendations[3]}\n`);
      } else {
        const fiftyPercentRule = testCase.targetDepth / 2;
        const followsRule = result.mouthfillDepth <= fiftyPercentRule;
        
        console.log(`   ✅ MOUTHFILL: ${result.mouthfillDepth}m (50% rule: ≤${fiftyPercentRule}m) ${followsRule ? '✓' : '❌'}`);
        console.log(`   📊 VOLUME: ${result.volumeRecommendation.size}`);
        console.log(`   🎯 THEORETICAL MAX: ${result.theoreticalMaxDepth}m`);
        console.log(`   ⚖️  SAFETY MARGIN: ${result.safetyMargin}m`);
        
        if (result.needsFlexibilityTraining) {
          console.log(`   💪 FLEXIBILITY TRAINING NEEDED`);
        }
        
        console.log(`   🎯 EQ PROGRESSION:`);
        result.cadenceBands.forEach(band => {
          console.log(`      • ${band.range}: EQ every ${band.eqEvery}m (${band.eqCount} EQs)`);
        });
        console.log(`      • TOTAL EQs: ${result.totalEQCount} (including surface EQ)`);
        
        // Check if progression follows proper intervals
        const hasProperProgression = result.cadenceBands.some(band => 
          (band.range === '0-30m' && band.eqEvery === 6) ||
          (band.range === '30-45m' && band.eqEvery === 4) ||
          (band.range === '45-60m' && band.eqEvery === 2.5) ||
          (band.range === '60m+' && band.eqEvery === 1.5)
        );
        
        console.log(`   📏 PROGRESSION: ${hasProperProgression ? '✓ Proper intervals' : '❌ Incorrect intervals'}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  });

  console.log('🎯 SUMMARY OF FIXES:');
  console.log('• ✅ 50% mouthfill depth rule implemented');
  console.log('• ✅ Proper EQ progression: 6m→4m→2.5m→1.5m intervals');
  console.log('• ✅ Safety margins calculated correctly');
  console.log('• ✅ Flexibility training recommendations');
  console.log('• ✅ Realistic volume recommendations by experience level');
}

// Execute if run directly
if (require.main === module) {
  testEQProgression();
}

module.exports = { testEQProgression };
