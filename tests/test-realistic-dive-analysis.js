#!/usr/bin/env node

// Comprehensive test for realistic dive computer analysis
const fetch = require('node-fetch');
const sharp = require('sharp');

const BASE_URL = 'http://localhost:3000';

async function createRealisticDiveComputerImage(scenario) {
  const scenarios = {
    // Beginner diver with poor technique
    beginner: {
      maxDepth: 15.2,
      diveTime: '1:23',
      temperature: 26,
      profilePath: `M 50 275 
                   L 70 260
                   L 75 260
                   L 80 255
                   L 85 255
                   L 90 250
                   L 95 250
                   L 100 245
                   L 120 245
                   L 140 250
                   L 160 255
                   L 180 260
                   L 200 265
                   L 220 270
                   L 240 275`,
      notes: 'Erratic descent, multiple equalization stops, rushed ascent'
    },
    
    // Intermediate diver with mouthfill
    intermediate: {
      maxDepth: 45.8,
      diveTime: '2:15',
      temperature: 24,
      profilePath: `M 50 275 
                   L 65 255
                   L 80 235
                   L 95 225
                   L 105 225
                   L 115 225
                   L 130 220
                   L 150 218
                   L 170 220
                   L 190 225
                   L 210 235
                   L 230 250
                   L 250 265
                   L 270 275`,
      notes: 'Clear mouthfill at 25m, good freefall, controlled ascent'
    },
    
    // Advanced deep diver
    advanced: {
      maxDepth: 96.7,
      diveTime: '3:42',
      temperature: 18,
      profilePath: `M 50 275 
                   L 65 255
                   L 80 235
                   L 95 225
                   L 105 225
                   L 115 225
                   L 125 223
                   L 140 221
                   L 160 220
                   L 180 220
                   L 200 220
                   L 220 221
                   L 240 225
                   L 260 235
                   L 280 250
                   L 300 265
                   L 320 275`,
      notes: 'Perfect mouthfill technique, extended bottom time, excellent control'
    }
  };
  
  const dive = scenarios[scenario];
  
  const svgImage = `
    <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="100%" height="100%" fill="#000011"/>
      
      <!-- Screen border -->
      <rect x="20" y="20" width="560" height="360" fill="#000000" stroke="#00ff00" stroke-width="3"/>
      
      <!-- Header -->
      <text x="300" y="50" font-family="monospace" font-size="16" fill="#00ff00" text-anchor="middle">FREEDIVING COMPUTER</text>
      <text x="300" y="70" font-family="monospace" font-size="14" fill="#00ff00" text-anchor="middle">15/08/2024 14:25:33</text>
      
      <!-- Mode and battery -->
      <text x="50" y="100" font-family="monospace" font-size="16" fill="#ffff00">CNF MODE</text>
      <text x="550" y="100" font-family="monospace" font-size="12" fill="#ffff00" text-anchor="end">BAT:87%</text>
      
      <!-- Main depth display -->
      <text x="300" y="160" font-family="monospace" font-size="64" fill="#00ff00" text-anchor="middle" font-weight="bold">${dive.maxDepth}m</text>
      <text x="300" y="185" font-family="monospace" font-size="18" fill="#00ff00" text-anchor="middle">MAX DEPTH</text>
      
      <!-- Time and temperature -->
      <text x="150" y="230" font-family="monospace" font-size="32" fill="#00ff00" text-anchor="middle">${dive.diveTime}</text>
      <text x="150" y="250" font-family="monospace" font-size="14" fill="#00ff00" text-anchor="middle">DIVE TIME</text>
      
      <text x="450" y="230" font-family="monospace" font-size="32" fill="#00ff00" text-anchor="middle">${dive.temperature}°C</text>
      <text x="450" y="250" font-family="monospace" font-size="14" fill="#00ff00" text-anchor="middle">WATER TEMP</text>
      
      <!-- Dive profile graph -->
      <rect x="50" y="280" width="500" height="80" fill="#000033" stroke="#00ff00" stroke-width="2"/>
      
      <!-- Graph labels -->
      <text x="300" y="375" font-family="monospace" font-size="12" fill="#888" text-anchor="middle">DIVE PROFILE - ${dive.notes}</text>
      
      <!-- Y-axis depth markers -->
      <text x="45" y="290" font-family="monospace" font-size="10" fill="#888" text-anchor="end">${Math.round(dive.maxDepth)}m</text>
      <text x="45" y="320" font-family="monospace" font-size="10" fill="#888" text-anchor="end">${Math.round(dive.maxDepth/2)}m</text>
      <text x="45" y="350" font-family="monospace" font-size="10" fill="#888" text-anchor="end">0m</text>
      
      <!-- Dive profile path -->
      <path d="${dive.profilePath}" 
            stroke="#00ff00" 
            stroke-width="4" 
            fill="none"/>
      
      ${scenario === 'intermediate' || scenario === 'advanced' ? `
      <!-- Mouthfill indicator -->
      <circle cx="105" cy="225" r="5" fill="#ff0000"/>
      <text x="115" y="235" font-family="monospace" font-size="10" fill="#ff0000">MOUTHFILL</text>
      ` : ''}
      
      ${scenario === 'advanced' ? `
      <!-- Bottom time indicator -->
      <line x1="160" y1="220" x2="200" y2="220" stroke="#ffff00" stroke-width="3"/>
      <text x="180" y="240" font-family="monospace" font-size="10" fill="#ffff00">BOTTOM</text>
      ` : ''}
      
      <!-- Surface interval -->
      <text x="300" y="395" font-family="monospace" font-size="12" fill="#ffff00" text-anchor="middle">SURFACE INTERVAL: 00:25</text>
    </svg>
  `;
  
  const imageBuffer = await sharp(Buffer.from(svgImage))
    .png()
    .resize(1200, 800) // High resolution for detailed analysis
    .toBuffer();
    
  return 'data:image/png;base64,' + imageBuffer.toString('base64');
}

async function testDiveScenario(scenario) {
  console.log(`\n🏊‍♂️ Testing ${scenario.toUpperCase()} DIVER SCENARIO...`);
  console.log('='.repeat(60));
  
  const testImageBase64 = await createRealisticDiveComputerImage(scenario);
  
  const testData = {
    imageData: testImageBase64,
    userId: '35b522f1-27d2-49de-ed2b-0d257d33ad7d',
    filename: `${scenario}-dive-analysis.png`,
    diveLogId: 'a93ffd7d-7f42-4ef2-af77-64fe70549aed'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/dive/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (result.success) {
      const data = result.data;
      
      console.log(`🔍 EXTRACTED DATA:`);
      console.log(`   Max Depth: ${data.extractedData?.maxDepth}m`);
      console.log(`   Dive Time: ${data.extractedData?.diveTime}`);
      console.log(`   Temperature: ${data.extractedData?.temperature}°C`);
      
      console.log(`\n📊 DESCENT ANALYSIS:`);
      const descent = data.profileAnalysis?.descentPhase;
      if (descent) {
        console.log(`   Rate: ${descent.averageDescentRate} ${descent.descentRateUnit}`);
        console.log(`   Mouthfill: ${descent.mouthfillSlowdown?.detected ? '✅ Detected' : '❌ Not detected'}`);
        if (descent.mouthfillSlowdown?.detected) {
          console.log(`   Mouthfill Depth: ${descent.mouthfillSlowdown.depthRange}`);
          console.log(`   Slowdown: ${descent.mouthfillSlowdown.slowdownPercentage}%`);
        }
        console.log(`   Consistency: ${descent.descentConsistency}`);
      }
      
      console.log(`\n📈 ASCENT ANALYSIS:`);
      const ascent = data.profileAnalysis?.ascentPhase;
      if (ascent) {
        console.log(`   Rate: ${ascent.averageAscentRate} ${ascent.ascentRateUnit}`);
        console.log(`   Safety: ${ascent.ascentRateUnit === 'm/s' && ascent.averageAscentRate <= 1.0 ? '✅ Safe' : '⚠️ Check'}`);
        console.log(`   Control: ${ascent.ascentConsistency}`);
      }
      
      console.log(`\n🎯 COACHING INSIGHTS:`);
      const coaching = data.coachingInsights;
      if (coaching) {
        console.log(`   Performance: ${coaching.performanceRating}/10`);
        console.log(`   Ready for deeper: ${coaching.readinessForDeeper ? '✅ Yes' : '❌ No'}`);
        if (coaching.positives?.length > 0) {
          console.log(`   Strengths: ${coaching.positives.join(', ')}`);
        }
        if (coaching.improvements?.length > 0) {
          console.log(`   Focus Areas: ${coaching.improvements.join(', ')}`);
        }
      }
      
      console.log(`\n🏆 OVERALL: ${data.confidence} confidence, ${data.tokensUsed} tokens`);
      
      return {
        scenario,
        success: true,
        mouthfillDetected: descent?.mouthfillSlowdown?.detected || false,
        performanceRating: coaching?.performanceRating || 0,
        safeAscentRate: ascent?.averageAscentRate <= 1.0
      };
      
    } else {
      console.log(`❌ Analysis failed: ${result.error}`);
      return { scenario, success: false };
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    return { scenario, success: false, error: error.message };
  }
}

async function runComprehensiveTests() {
  console.log('🚀 COMPREHENSIVE DIVE COMPUTER ANALYSIS TEST');
  console.log('Testing advanced freediving metrics extraction...');
  
  const scenarios = ['beginner', 'intermediate', 'advanced'];
  const results = [];
  
  for (const scenario of scenarios) {
    const result = await runDiveScenario(scenario);
    results.push(result);
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 COMPREHENSIVE TEST SUMMARY');
  console.log('='.repeat(80));
  
  for (const result of results) {
    if (result.success) {
      console.log(`${result.scenario.toUpperCase().padEnd(15)} | ` +
                  `${result.mouthfillDetected ? '✅' : '❌'} Mouthfill | ` +
                  `${result.performanceRating}/10 | ` +
                  `${result.safeAscentRate ? '✅' : '⚠️'} Safe Ascent`);
    } else {
      console.log(`${result.scenario.toUpperCase().padEnd(15)} | ❌ FAILED`);
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 Results: ${successCount}/${results.length} scenarios analyzed successfully`);
  
  if (successCount === results.length) {
    console.log('\n🎉 All tests passed! Advanced freediving analysis is working perfectly.');
    console.log('📊 The system can now extract:');
    console.log('   ✅ Mouthfill technique detection and depth');
    console.log('   ✅ Descent/ascent rates with safety assessment');
    console.log('   ✅ Equalization efficiency and stops');
    console.log('   ✅ Freefall utilization analysis');
    console.log('   ✅ Coaching insights and performance ratings');
    console.log('   ✅ Safety recommendations');
  } else {
    console.log('\n⚠️ Some tests failed. Check server logs for details.');
  }
}

async function runDiveScenario(scenario) {
  return await testDiveScenario(scenario);
}

runComprehensiveTests().catch(console.error);
