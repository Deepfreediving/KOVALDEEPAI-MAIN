#!/usr/bin/env node

/**
 * Test Live 88m Dive Analysis with Real OpenAI API Call
 * This will test the actual API with real dive computer data
 */

const fs = require('fs');
const path = require('path');

async function testLive88mAnalysis() {
  console.log('🧪 Testing Live 88m Dive Analysis with Real API...\n');

  // Use real dive computer data from the 88m dive
  const realDiveLogData = {
    targetDepth: 88,
    reachedDepth: 88,
    totalDiveTime: '4:15',
    discipline: 'CNF',
    location: 'Blue Hole',
    equipment: 'Monofin',
    wetsuit: '5mm',
    notes: 'Deep training dive with focus on technique',
    userId: 'test-user',
    imageAnalysis: {
      extractedMetrics: {
        max_depth: 88.2,
        dive_time: '4:15',
        dive_time_seconds: 255,
        temperature: 24.5,
        descent_time: 120,
        ascent_time: 135,
        descent_speed_mps: 0.735,
        ascent_speed_mps: 0.653,
        surface_interval: '2:30',
        hang_time: 15
      },
      coachingInsights: {
        performanceRating: 8.5,
        safetyAssessment: 'Good',
        recommendations: ['Improve descent efficiency', 'Work on hang time technique']
      },
      confidence: 0.95
    }
  };

  try {
    console.log('📤 Calling live API with real dive computer data...');
    
    const response = await fetch('http://localhost:3000/api/analyze/dive-log-openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(realDiveLogData)
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log('✅ API Response received');
    console.log('━'.repeat(80));
    console.log(JSON.stringify(result, null, 2));
    console.log('━'.repeat(80));

    // Check if the analysis mentions specific metrics
    const analysis = result.analysis || '';
    const mentionsRealDepth = analysis.includes('88.2') || analysis.includes('88.2m');
    const mentionsTemperature = analysis.includes('24.5') || analysis.includes('24.5°C');
    const mentionsDescentSpeed = analysis.includes('44.1') || analysis.includes('44.1 m/min');
    const mentionsAscentSpeed = analysis.includes('39.2') || analysis.includes('39.2 m/min');
    const mentionsHangTime = analysis.includes('15 seconds');

    console.log('\n🔍 Analysis Quality Check:');
    console.log(`- References real depth (88.2m): ${mentionsRealDepth ? '✓' : '✗'}`);
    console.log(`- References temperature (24.5°C): ${mentionsTemperature ? '✓' : '✗'}`);
    console.log(`- References descent speed (44.1 m/min): ${mentionsDescentSpeed ? '✓' : '✗'}`);
    console.log(`- References ascent speed (39.2 m/min): ${mentionsAscentSpeed ? '✓' : '✗'}`);
    console.log(`- References hang time (15 seconds): ${mentionsHangTime ? '✓' : '✗'}`);

    const qualityScore = [mentionsRealDepth, mentionsTemperature, mentionsDescentSpeed, mentionsAscentSpeed, mentionsHangTime]
      .filter(Boolean).length;
    
    console.log(`\n🎯 Overall Quality Score: ${qualityScore}/5 metrics referenced`);
    
    if (qualityScore >= 3) {
      console.log('✅ GOOD: OpenAI is using the extracted metrics properly');
    } else {
      console.log('❌ ISSUE: OpenAI is not fully utilizing the extracted metrics');
      console.log('   This suggests the prompt may need further refinement');
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️ Server not running. Starting local test instead...');
      await testOffline88mAnalysis();
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

async function testOffline88mAnalysis() {
  console.log('\n🔧 Running offline simulation of OpenAI analysis...');
  
  // Simulate what should happen based on the prompt we verified earlier
  const expectedAnalysis = `Looking at your 88.2m CNF dive, this was an impressive performance that hit your target depth precisely. Let me break down the technical aspects:

**Performance Assessment:**
Your dive computer shows you reached exactly 88.2m in 4:15 total dive time - excellent target achievement. The 0.2m variance is within normal computer accuracy.

**Technical Analysis:**
- Descent rate: 44.1 m/min (120 seconds to 88.2m) - this is quite efficient for CNF
- Ascent rate: 39.2 m/min (135 seconds from bottom) - good controlled ascent
- Hang time: 15 seconds at depth - short but adequate for this depth
- Water temperature: 24.5°C - comfortable thermal conditions

**Safety Review:**
The descent/ascent ratio looks good (120s down, 135s up). Your ascent is appropriately slower than descent, showing good control. The 15-second hang time suggests you were comfortable at depth.

**Progression Coaching:**
Your computer data shows solid technique fundamentals. The 8.5/10 performance rating reflects strong execution. Focus areas from the vision analysis suggest working on descent efficiency - even though your 44.1 m/min is good, there's room for optimization.

This is excellent work for 88m CNF. The real computer data confirms you're diving safely and efficiently at this depth.`;

  console.log('📊 Expected Analysis (simulated):');
  console.log('━'.repeat(80));
  console.log(expectedAnalysis);
  console.log('━'.repeat(80));
  
  console.log('\n✅ This simulation shows how OpenAI SHOULD respond when given real extracted metrics');
  console.log('   The analysis references specific values: 88.2m, 44.1 m/min, 39.2 m/min, 24.5°C, 15 seconds');
}

testLive88mAnalysis().catch(console.error);
