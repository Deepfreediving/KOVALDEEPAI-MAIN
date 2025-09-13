#!/usr/bin/env node

/**
 * Test Elite Coaching System Fix
 * 
 * This test validates that the AI coaching system now properly recognizes
 * elite-level performances and provides appropriate world-class analysis
 * instead of basic safety advice.
 */

const fs = require('fs');
const path = require('path');

async function testEliteCoaching() {
  console.log('🏆 TESTING ELITE COACHING SYSTEM FIX');
  console.log('=====================================\n');

  // Test with Daniel's 110m PB - should trigger ELITE mode
  const testDiveLog = {
    date: '2024-01-15',
    discipline: 'CWT',
    location: 'Blue Hole',
    targetDepth: '110',
    reachedDepth: '110',
    totalDiveTime: '3:45',
    mouthfillDepth: '30',
    notes: 'Personal best attempt',
    imageAnalysis: {
      extractedMetrics: {
        max_depth: '110.0',
        dive_time: '3:45',
        dive_time_seconds: '225',
        temperature: '23.5',
        descent_time: '112',
        ascent_time: '108',
        hang_time: '5',
        confidence: '0.95'
      },
      coachingInsights: {
        performanceRating: 9.5,
        safetyAssessment: 'Excellent technique',
        dataQuality: 'High'
      }
    }
  };

  console.log('📊 Test dive data:');
  console.log(`- Depth: ${testDiveLog.reachedDepth}m (ELITE LEVEL)`);
  console.log(`- Discipline: ${testDiveLog.discipline}`);
  console.log(`- Time: ${testDiveLog.totalDiveTime}`);
  console.log(`- Computer metrics: Available ✅\n`);

  try {
    const response = await fetch('http://localhost:3000/api/analyze/dive-log-openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        adminUserId: 'test-elite-user',
        nickname: 'Daniel Koval',
        diveLogData: testDiveLog
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error (${response.status}): ${error}`);
    }

    const result = await response.json();
    
    console.log('✅ API Response received successfully\n');
    console.log('🤖 AI COACHING ANALYSIS:');
    console.log('========================');
    console.log(result.analysis);
    console.log('\n========================\n');

    // Analyze the response quality
    const analysis = result.analysis.toLowerCase();
    const indicators = {
      eliteRecognition: [
        'elite', 'world-class', 'championship', 'elite-level',
        'competitive', 'world record', 'professional'
      ],
      technicalSophistication: [
        'optimization', 'efficiency', 'marginal gains', 'refinement',
        'periodization', 'physiological adaptation', 'technique refinements'
      ],
      basicSafetyWarnings: [
        'consult with a qualified instructor', 'basic safety',
        'start shallow', 'gradually increase', 'safety course',
        'beginner', 'fundamental', 'always dive with a buddy'
      ]
    };

    let eliteScore = 0;
    let technicalScore = 0;
    let basicWarningPenalty = 0;

    indicators.eliteRecognition.forEach(term => {
      if (analysis.includes(term)) eliteScore++;
    });

    indicators.technicalSophistication.forEach(term => {
      if (analysis.includes(term)) technicalScore++;
    });

    indicators.basicSafetyWarnings.forEach(term => {
      if (analysis.includes(term)) basicWarningPenalty++;
    });

    console.log('📈 COACHING QUALITY ANALYSIS:');
    console.log(`🏆 Elite recognition score: ${eliteScore}/${indicators.eliteRecognition.length}`);
    console.log(`🔧 Technical sophistication: ${technicalScore}/${indicators.technicalSophistication.length}`);
    console.log(`⚠️ Basic safety warnings: ${basicWarningPenalty} (should be 0 for elite)`);

    const overallQuality = eliteScore >= 2 && technicalScore >= 3 && basicWarningPenalty === 0;
    
    console.log(`\n${overallQuality ? '✅' : '❌'} Overall Quality: ${overallQuality ? 'ELITE COACHING DETECTED' : 'NEEDS IMPROVEMENT'}`);

    if (overallQuality) {
      console.log('\n🎯 SUCCESS: The AI coaching system now provides elite-level analysis!');
      console.log('- Recognizes world-class performance levels');
      console.log('- Provides sophisticated technical analysis');
      console.log('- Avoids inappropriate basic safety advice');
    } else {
      console.log('\n❌ ISSUE: The coaching system still needs refinement');
      if (eliteScore < 2) console.log('- Missing elite performance recognition');
      if (technicalScore < 3) console.log('- Insufficient technical sophistication');
      if (basicWarningPenalty > 0) console.log('- Still providing basic safety warnings to elite athlete');
    }

    return overallQuality;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Test with intermediate dive to ensure system still works properly
async function testIntermediateCoaching() {
  console.log('\n\n📈 TESTING INTERMEDIATE COACHING (Control Test)');
  console.log('==============================================\n');

  const testDiveLog = {
    date: '2024-01-15',
    discipline: 'CWT',
    location: 'Pool',
    targetDepth: '45',
    reachedDepth: '42',
    totalDiveTime: '2:15',
    notes: 'Good training dive',
    imageAnalysis: {
      extractedMetrics: {
        max_depth: '42.0',
        dive_time: '2:15',
        dive_time_seconds: '135',
        temperature: '26.0',
        descent_time: '65',
        ascent_time: '62',
        hang_time: '8',
        confidence: '0.92'
      }
    }
  };

  console.log('📊 Test dive data:');
  console.log(`- Depth: ${testDiveLog.reachedDepth}m (INTERMEDIATE LEVEL)`);
  console.log(`- Should receive balanced coaching with safety guidance\n`);

  try {
    const response = await fetch('http://localhost:3000/api/analyze/dive-log-openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        adminUserId: 'test-intermediate-user',
        nickname: 'Training Diver',
        diveLogData: testDiveLog
      })
    });

    const result = await response.json();
    console.log('🤖 Intermediate Coaching Analysis (first 300 chars):');
    console.log(result.analysis.substring(0, 300) + '...\n');

    // Should NOT be elite level but should be comprehensive
    const analysis = result.analysis.toLowerCase();
    const hasEliteMode = analysis.includes('elite') || analysis.includes('world-class') || analysis.includes('championship');
    
    console.log(`${hasEliteMode ? '❌' : '✅'} Correctly identified as intermediate level: ${!hasEliteMode}`);
    
    return !hasEliteMode;

  } catch (error) {
    console.error('❌ Intermediate test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 ELITE COACHING SYSTEM VALIDATION TEST');
  console.log('========================================\n');

  const eliteTest = await testEliteCoaching();
  const intermediateTest = await testIntermediateCoaching();

  console.log('\n\n🏁 FINAL TEST RESULTS:');
  console.log('======================');
  console.log(`🏆 Elite coaching test: ${eliteTest ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`📈 Intermediate coaching test: ${intermediateTest ? 'PASSED ✅' : 'FAILED ❌'}`);
  
  const overallSuccess = eliteTest && intermediateTest;
  console.log(`\n🎯 Overall system fix: ${overallSuccess ? 'SUCCESS ✅' : 'NEEDS MORE WORK ❌'}`);

  if (overallSuccess) {
    console.log('\n🚀 The AI coaching system now properly:');
    console.log('- Detects elite vs intermediate performance levels');
    console.log('- Provides appropriate analysis for world-class athletes');
    console.log('- Maintains comprehensive coaching for developing divers');
    console.log('- Uses real dive computer metrics in sophisticated analysis');
  }

  process.exit(overallSuccess ? 0 : 1);
}

// Run the test
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
