// Comprehensive test of EQ Plan API with realistic diver profiles
// Testing various scenarios to find issues and quirks

const profiles = [
  {
    name: "Alex - Advanced CNF Athlete",
    targetDepth: 90,
    maxReversePack: 85,
    userLevel: "advanced",
    experience: "5+ years, competes internationally",
    notes: "Very experienced, should handle deep mouthfill well"
  },
  {
    name: "Maria - Experienced Recreational",
    targetDepth: 80,
    maxReversePack: 70,
    userLevel: "intermediate", 
    experience: "3 years freediving, regular depth training",
    notes: "Good reverse pack capability, solid intermediate"
  },
  {
    name: "James - Intermediate Pusher",
    targetDepth: 75,
    maxReversePack: 65,
    userLevel: "intermediate",
    experience: "2.5 years, pushing limits safely",
    notes: "Decent technique, reasonable reverse pack depth"
  },
  {
    name: "Sarah - Progressing Beginner",
    targetDepth: 70,
    maxReversePack: 45,
    userLevel: "beginner",
    experience: "18 months, recently learned mouthfill",
    notes: "Lower reverse pack capability, needs guidance"
  },
  {
    name: "Tom - New to Depth",
    targetDepth: 60,
    maxReversePack: 35,
    userLevel: "beginner",
    experience: "6 months, just starting depth work",
    notes: "Limited reverse pack, may need flexibility training"
  },
  {
    name: "Lisa - Conservative Depth",
    targetDepth: 50,
    maxReversePack: null, // Unknown - will trigger guidance
    userLevel: "beginner",
    experience: "1 year, hasn't tested reverse pack yet",
    notes: "Should get friendly guidance, not harsh error"
  }
];

async function testProfile(profile) {
  console.log(`\n🧪 TESTING: ${profile.name}`);
  console.log(`📊 Profile: ${profile.experience}`);
  console.log(`🎯 Target: ${profile.targetDepth}m | Reverse Pack: ${profile.maxReversePack || 'Unknown'}m | Level: ${profile.userLevel}`);
  console.log(`💭 Notes: ${profile.notes}`);
  console.log('─'.repeat(80));

  try {
    const response = await fetch('http://localhost:3000/api/coach/eq-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetDepth: profile.targetDepth,
        maxReversePack: profile.maxReversePack,
        userLevel: profile.userLevel
      })
    });
    
    const result = await response.json();
    
    if (!result.success && result.requiresInfo) {
      // Handle case where reverse pack depth is unknown
      console.log('📋 GUIDANCE PROVIDED (No Reverse Pack Data):');
      console.log(`💬 Message: ${result.message}`);
      console.log(`🔍 Why Important: ${result.explanation.why}`);
      console.log(`📚 What Is It: ${result.explanation.whatIs}`);
      console.log(`\n🎯 Test Protocol:`);
      result.testProtocol.instructions.forEach(instruction => {
        console.log(`   ${instruction}`);
      });
      console.log(`\n🔄 Alternatives:`);
      result.testProtocol.alternatives.forEach(alt => {
        console.log(`   ${alt}`);
      });
      console.log(`\n💪 Encouragement: ${result.encouragement}`);
      
      if (result.quickEstimate) {
        console.log(`\n⚡ Quick Estimate:`);
        console.log(`   ${result.quickEstimate.message}`);
        console.log(`   ${result.quickEstimate.assumptions}`);
        console.log(`   ${result.quickEstimate.estimatedMouthfill}`);
        console.log(`   ${result.quickEstimate.warning}`);
      }
      
      console.log('\n✅ RESULT: Friendly guidance provided (GOOD!)');
      return;
    }
    
    if (result.success && result.eqPlan) {
      const plan = result.eqPlan;
      console.log('📊 EQ PLAN GENERATED:');
      console.log(`🎯 Mouthfill: ${plan.mouthfillVolume || plan.volumeRecommendation?.size} at ${plan.mouthfillDepth}m`);
      console.log(`📏 Based on: ${plan.maxReversePack}m reverse pack capability`);
      console.log(`🧮 Volume Logic: ${plan.volumeRecommendation?.description}`);
      console.log(`🔢 Theoretical Max: ${plan.theoreticalMaxDepth}m (Safety margin: ${plan.safetyMargin}m)`);
      console.log(`⚡ Total EQs: ${plan.totalEQCount} (including surface EQ)`);
      
      console.log('\n📋 EQ Cadence:');
      plan.cadenceBands.forEach(band => {
        console.log(`   ${band.range}: EQ every ${band.eqEvery}m (${band.eqCount} EQs)`);
      });
      
      if (plan.needsFlexibilityTraining) {
        console.log('\n⚠️  FLEXIBILITY TRAINING RECOMMENDED');
        console.log('   Reason: Reverse pack capability too shallow for target depth');
      }
      
      console.log('\n💡 Daniel\'s Notes:');
      plan.notes.forEach(note => {
        console.log(`   • ${note}`);
      });
      
      // ANALYSIS: Check for potential issues
      console.log('\n🔍 ANALYSIS:');
      
      // Check mouthfill depth logic
      const depthDifference = plan.maxReversePack - plan.mouthfillDepth;
      if (depthDifference < 5 || depthDifference > 10) {
        console.log(`   ⚠️  ISSUE: Mouthfill depth difference is ${depthDifference}m (should be 5-10m)`);
      } else {
        console.log(`   ✅ Mouthfill depth logic correct (${depthDifference}m shallower)`);
      }
      
      // Check if theoretical max makes sense
      if (plan.theoreticalMaxDepth < profile.targetDepth) {
        console.log(`   ⚠️  ISSUE: Theoretical max (${plan.theoreticalMaxDepth}m) < target (${profile.targetDepth}m)`);
      } else {
        console.log(`   ✅ Theoretical max exceeds target depth`);
      }
      
      // Check volume recommendation for experience level
      const volumeOK = (
        (profile.userLevel === 'beginner' && plan.volumeRecommendation.size.includes('½')) ||
        (profile.userLevel === 'intermediate' && plan.volumeRecommendation.size.includes('¾')) ||
        (profile.userLevel === 'advanced')
      );
      
      if (volumeOK) {
        console.log(`   ✅ Volume recommendation appropriate for ${profile.userLevel}`);
      } else {
        console.log(`   ⚠️  QUESTION: Volume (${plan.volumeRecommendation.size}) for ${profile.userLevel}?`);
      }
      
      // Check EQ count reasonableness
      const expectedEQs = Math.ceil(profile.targetDepth / 5); // Rough estimate
      if (plan.totalEQCount < expectedEQs * 0.7 || plan.totalEQCount > expectedEQs * 1.5) {
        console.log(`   ⚠️  QUESTION: ${plan.totalEQCount} EQs for ${profile.targetDepth}m (expected ~${expectedEQs})`);
      } else {
        console.log(`   ✅ EQ count seems reasonable (${plan.totalEQCount} for ${profile.targetDepth}m)`);
      }
      
      console.log('\n✅ RESULT: Complete EQ plan provided');
      
    } else {
      console.log('❌ ERROR: Unexpected response format');
      console.log(JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.log(`❌ ERROR testing ${profile.name}:`, error.message);
  }
}

async function runAllTests() {
  console.log('🏊‍♂️ REALISTIC DIVER PROFILE TESTING');
  console.log('=====================================');
  console.log('Testing EQ Plan API with 6 realistic diver scenarios');
  console.log('Looking for issues, quirks, and incorrect logic\n');
  
  // Test if API is running
  try {
    const healthCheck = await fetch('http://localhost:3000/api/health');
    if (!healthCheck.ok) {
      throw new Error('API not responding');
    }
    console.log('✅ API is running on localhost:3000\n');
  } catch (error) {
    console.log('❌ API not running. Please start with: npm run dev');
    console.log('   Then run this test again.\n');
    return;
  }
  
  // Test each profile
  for (const profile of profiles) {
    await testProfile(profile);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🎯 TESTING COMPLETE');
  console.log('='.repeat(80));
  console.log('🔍 SUMMARY OF FINDINGS:');
  console.log('• Check console output above for any ⚠️  ISSUE or ⚠️  QUESTION markers');
  console.log('• Verify mouthfill depth calculations follow Daniel\'s 5-10m rule');
  console.log('• Confirm volume recommendations match experience levels'); 
  console.log('• Ensure theoretical max exceeds target depths');
  console.log('• Validate EQ counts are reasonable for target depths');
  console.log('• Confirm friendly guidance for unknown reverse pack depths');
  console.log('\n💡 Next steps: Review any flagged issues and adjust calculations if needed');
}

// Run the tests
runAllTests().catch(console.error);
