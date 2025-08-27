// Direct function testing - bypasses server issues
// Tests the calculateEQPlan function directly with realistic profiles

// Import the function directly (simulated - we'll copy the logic)
function calculateEQPlan(targetDepth, maxReversePack = null, experience = 'beginner') {
  
  // 🎯 GUIDANCE: Need reverse pack depth for precise mouthfill calculation
  if (!maxReversePack) {
    return {
      needsReversePack: true,
      message: 'To give you the most accurate mouthfill guidance, I need to know your reverse pack capability',
      explanation: {
        why: 'Your reverse pack depth is the foundation for calculating optimal mouthfill depth. Daniel\'s methodology: mouthfill should be taken 5-10m shallower than your maximum reverse pack depth.',
        whatIs: 'Reverse packing is the ability to push air from your lungs back into your mouth at depth, creating counter-pressure for equalization.',
        howToTest: 'During your next dive, note the deepest point where you can still comfortably reverse pack without forcing it.'
      },
      guidance: 'No worries if you haven\'t tested this yet! Here\'s how to find your reverse pack depth:',
      testProtocol: {
        instructions: [
          "📋 During your next dive session (after proper warm-up):",
          "1. 🤿 Enter a comfortable CWT dive with bifins",
          "2. 📏 Begin your descent as normal", 
          "3. 🔄 Every 5-10m: Relax → Equalize → Try reverse pack",
          "4. 📝 Note the deepest depth where reverse pack feels effortless",
          "5. 🛑 Stop when reverse pack becomes difficult or forced",
          "⚠️ SAFETY: Never force a reverse pack - it should feel natural!"
        ],
        alternatives: [
          "🏊 Pool practice: Work on reverse packing in shallow water first",
          "🧘 Dry training: Practice the mechanics on land before diving",
          "👨‍🏫 With instructor: Have an experienced coach assess your capability"
        ]
      },
      encouragement: 'Once you know your reverse pack depth, I can create a perfect mouthfill plan tailored specifically to your physiology!'
    };
  }

  // Calculate mouthfill depth according to Daniel's protocol
  // Mouthfill = 5-10m shallower than max reverse pack (never <22m, never >50m)
  let mouthfillDepth;
  let needsFlexibilityTraining = false;
  
  if (maxReversePack <= 30) {
    // If they can't reverse pack deeper than 30m, they need flexibility training first
    mouthfillDepth = 22; // Minimum allowed
    needsFlexibilityTraining = true;
  } else if (maxReversePack <= 40) {
    mouthfillDepth = Math.max(22, maxReversePack - 8); // 5-10m shallower
  } else if (maxReversePack <= 50) {
    mouthfillDepth = Math.max(22, maxReversePack - 10); // 10m shallower for deeper packs
  } else {
    mouthfillDepth = 40; // Cap at reasonable depth even if they can reverse pack very deep
  }

  // Volume recommendation based on experience (Daniel's protocol)
  let volumeRecommendation;
  switch (experience) {
    case 'beginner': // 1-2 years mouthfill experience
      volumeRecommendation = {
        size: '½ full (ideal for beginners)',
        description: 'Half full - ideal size for beginner freedivers with 1-2 years mouthfill experience',
        multiplier: 2
      };
      break;
    case 'intermediate': // 2-3 years experience  
      volumeRecommendation = {
        size: '¾ full (golf ball size)',
        description: 'Golf ball ¾ size - ideal for intermediate with 2-3 years experience',
        multiplier: 3
      };
      break;
    case 'advanced': // 4+ years experience
      volumeRecommendation = {
        size: '¼ to ¾ full (technique dependent)',
        description: 'Variable based on technique mastery and comfort',
        multiplier: 4
      };
      break;
    default:
      volumeRecommendation = {
        size: '¼ full (grape-sized)',
        description: 'Start small - grape-sized ¼ full',
        multiplier: 1.5
      };
  }

  // Daniel's multiplier formula: Mouthfill Depth × Relative Volume (1x–5x) = Max Equalization Depth
  const theoreticalMax = mouthfillDepth * volumeRecommendation.multiplier;
  const safetyMargin = Math.max(5, theoreticalMax - targetDepth);

  // EQ cadence from Daniel's methodology
  const cadenceBands = [
    { range: '0-10m', eqEvery: 2, count: 5 },
    { range: '10-20m', eqEvery: 2, count: 5 },
    { range: '20-30m', eqEvery: 3, count: Math.ceil(Math.min(10, Math.max(0, targetDepth - 20)) / 3) },
    { range: '30-50m', eqEvery: 4, count: Math.ceil(Math.min(20, Math.max(0, targetDepth - 30)) / 4) },
    { range: '50m+', eqEvery: 6, count: Math.ceil(Math.max(0, targetDepth - 50) / 6) }
  ];

  const totalEQs = 1 + cadenceBands.reduce((sum, band) => sum + band.count, 0);

  return {
    mouthfillDepth,
    maxReversePack,
    volumeRecommendation,
    theoreticalMaxDepth: Math.round(theoreticalMax),
    cadenceBands: cadenceBands.filter(band => band.count > 0),
    totalEQCount: totalEQs,
    safetyMargin: Math.round(safetyMargin),
    needsFlexibilityTraining,
    notes: [
      `Mouthfill at ${mouthfillDepth}m - ${volumeRecommendation.size}`,
      `Based on your max reverse pack depth of ${maxReversePack}m`,
      maxReversePack <= 30 ? 'Focus on flexibility training to improve reverse pack depth' : 
        'Theoretical max with this setup: ' + Math.round(theoreticalMax) + 'm',
      'Take mouthfill during sink phase - NEVER while kicking or pulling',
      'Glottis lock immediately after fill; lips sealed, jaw open',
      'Air centralized in back of mouth; tongue relaxed on bottom',
      'Abort if leak sensation or difficulty managing air'
    ]
  };
}

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

function testProfile(profile) {
  console.log(`\n🧪 TESTING: ${profile.name}`);
  console.log(`📊 Profile: ${profile.experience}`);
  console.log(`🎯 Target: ${profile.targetDepth}m | Reverse Pack: ${profile.maxReversePack || 'Unknown'}m | Level: ${profile.userLevel}`);
  console.log(`💭 Notes: ${profile.notes}`);
  console.log('─'.repeat(80));

  const result = calculateEQPlan(profile.targetDepth, profile.maxReversePack, profile.userLevel);
  
  if (result.needsReversePack) {
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
    console.log('\n✅ RESULT: Friendly guidance provided (GOOD!)');
    return;
  }
  
  // Analyze the EQ plan
  console.log('📊 EQ PLAN GENERATED:');
  console.log(`🎯 Mouthfill: ${result.volumeRecommendation.size} at ${result.mouthfillDepth}m`);
  console.log(`📏 Based on: ${result.maxReversePack}m reverse pack capability`);
  console.log(`🧮 Volume Logic: ${result.volumeRecommendation.description}`);
  console.log(`🔢 Theoretical Max: ${result.theoreticalMaxDepth}m (Safety margin: ${result.safetyMargin}m)`);
  console.log(`⚡ Total EQs: ${result.totalEQCount} (including surface EQ)`);
  
  console.log('\n📋 EQ Cadence:');
  result.cadenceBands.forEach(band => {
    console.log(`   ${band.range}: EQ every ${band.eqEvery}m (${band.count} EQs)`);
  });
  
  if (result.needsFlexibilityTraining) {
    console.log('\n⚠️  FLEXIBILITY TRAINING RECOMMENDED');
    console.log('   Reason: Reverse pack capability too shallow for target depth');
  }
  
  console.log('\n💡 Daniel\'s Notes:');
  result.notes.forEach(note => {
    console.log(`   • ${note}`);
  });
  
  // ANALYSIS: Check for potential issues
  console.log('\n🔍 ANALYSIS & ISSUE DETECTION:');
  
  // Check mouthfill depth logic
  const depthDifference = result.maxReversePack - result.mouthfillDepth;
  if (depthDifference < 5 || depthDifference > 10) {
    console.log(`   ⚠️  ISSUE: Mouthfill depth difference is ${depthDifference}m (should be 5-10m)`);
  } else {
    console.log(`   ✅ Mouthfill depth logic correct (${depthDifference}m shallower than reverse pack)`);
  }
  
  // Check if theoretical max makes sense
  if (result.theoreticalMaxDepth < profile.targetDepth) {
    console.log(`   ⚠️  CRITICAL ISSUE: Theoretical max (${result.theoreticalMaxDepth}m) < target (${profile.targetDepth}m)`);
    console.log(`      This means the calculated plan won't work for the target depth!`);
  } else {
    const buffer = result.theoreticalMaxDepth - profile.targetDepth;
    console.log(`   ✅ Theoretical max exceeds target depth by ${buffer}m`);
  }
  
  // Check volume recommendation for experience level
  const volumeOK = (
    (profile.userLevel === 'beginner' && result.volumeRecommendation.size.includes('½')) ||
    (profile.userLevel === 'intermediate' && result.volumeRecommendation.size.includes('¾')) ||
    (profile.userLevel === 'advanced')
  );
  
  if (volumeOK) {
    console.log(`   ✅ Volume recommendation appropriate for ${profile.userLevel}`);
  } else {
    console.log(`   ⚠️  QUESTION: Volume (${result.volumeRecommendation.size}) for ${profile.userLevel}?`);
  }
  
  // Check EQ count reasonableness (Daniel's methodology)
  const expectedEQs = Math.ceil(profile.targetDepth / 5); // Rough estimate
  if (result.totalEQCount < expectedEQs * 0.6 || result.totalEQCount > expectedEQs * 1.8) {
    console.log(`   ⚠️  QUESTION: ${result.totalEQCount} EQs for ${profile.targetDepth}m (expected ~${expectedEQs})`);
  } else {
    console.log(`   ✅ EQ count seems reasonable (${result.totalEQCount} for ${profile.targetDepth}m)`);
  }
  
  // Check if multiplier makes sense
  const actualMultiplier = result.theoreticalMaxDepth / result.mouthfillDepth;
  const expectedMultiplier = result.volumeRecommendation.multiplier;
  if (Math.abs(actualMultiplier - expectedMultiplier) > 0.1) {
    console.log(`   ⚠️  CALCULATION ERROR: Multiplier should be ${expectedMultiplier}x but calculated ${actualMultiplier.toFixed(1)}x`);
  } else {
    console.log(`   ✅ Daniel's multiplier formula applied correctly (${actualMultiplier.toFixed(1)}x)`);
  }
  
  // Safety checks
  if (result.mouthfillDepth < 22) {
    console.log(`   ⚠️  SAFETY ISSUE: Mouthfill depth ${result.mouthfillDepth}m below minimum (22m)`);
  } else if (result.mouthfillDepth > 50) {
    console.log(`   ⚠️  SAFETY ISSUE: Mouthfill depth ${result.mouthfillDepth}m above maximum (50m)`);
  } else {
    console.log(`   ✅ Mouthfill depth within safe range (22-50m)`);
  }
  
  console.log('\n✅ RESULT: Complete EQ plan analyzed');
}

function runAllTests() {
  console.log('🏊‍♂️ COMPREHENSIVE DIVER PROFILE TESTING');
  console.log('==========================================');
  console.log('Testing EQ Plan calculation logic with realistic scenarios');
  console.log('🔍 Looking for: calculation errors, logic issues, safety problems\n');
  
  profiles.forEach(profile => {
    testProfile(profile);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('🎯 TESTING COMPLETE - SUMMARY');
  console.log('='.repeat(80));
  console.log('🔍 Issues to look for in output above:');
  console.log('   ⚠️  ISSUE - Logic problems that need fixing');
  console.log('   ⚠️  CRITICAL ISSUE - Serious calculation errors');
  console.log('   ⚠️  SAFETY ISSUE - Dangerous recommendations');
  console.log('   ⚠️  QUESTION - Areas that need review');
  console.log('   ✅ - Correct calculations and logic');
  console.log('\n💡 Key validation points:');
  console.log('• Mouthfill = reverse pack depth - 5-10m');
  console.log('• Theoretical max = mouthfill depth × volume multiplier'); 
  console.log('• Theoretical max must exceed target depth');
  console.log('• Volume recommendations match experience levels');
  console.log('• Safety boundaries respected (22-50m mouthfill range)');
  console.log('• Friendly guidance for unknown reverse pack depths');
}

// Run the comprehensive test
runAllTests();
