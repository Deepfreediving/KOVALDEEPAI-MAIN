#!/usr/bin/env node

// Detailed test to see full vision analysis results
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testDetailedVisionAnalysis() {
  console.log('🔬 Testing DETAILED Vision Analysis...');
  
  const sharp = require('sharp');
  
  // Create realistic dive computer showing mouthfill technique
  const realDiveComputerSVG = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="100%" height="100%" fill="#000011"/>
      
      <!-- Screen border -->
      <rect x="10" y="10" width="380" height="280" fill="#000000" stroke="#00ff00" stroke-width="3"/>
      
      <!-- Header with date/time -->
      <text x="200" y="35" font-family="monospace" font-size="14" fill="#00ff00" text-anchor="middle">7/8/2018 10:10:16</text>
      
      <!-- Mode indicator -->
      <text x="40" y="60" font-family="monospace" font-size="16" fill="#ffff00">FREE DIVE MODE</text>
      <text x="360" y="60" font-family="monospace" font-size="12" fill="#ffff00" text-anchor="end">BAT:99%</text>
      
      <!-- Main depth display -->
      <text x="200" y="110" font-family="monospace" font-size="48" fill="#00ff00" text-anchor="middle" font-weight="bold">96.7m</text>
      <text x="200" y="130" font-family="monospace" font-size="16" fill="#00ff00" text-anchor="middle">MAX DEPTH</text>
      
      <!-- Time display -->
      <text x="100" y="170" font-family="monospace" font-size="24" fill="#00ff00" text-anchor="middle">2:46</text>
      <text x="100" y="190" font-family="monospace" font-size="12" fill="#00ff00" text-anchor="middle">DIVE TIME</text>
      
      <!-- Temperature -->
      <text x="300" y="170" font-family="monospace" font-size="24" fill="#00ff00" text-anchor="middle">30°C</text>
      <text x="300" y="190" font-family="monospace" font-size="12" fill="#00ff00" text-anchor="middle">WATER TEMP</text>
      
      <!-- Dive profile graph with clear mouthfill pattern -->
      <rect x="40" y="210" width="320" height="70" fill="#000033" stroke="#00ff00" stroke-width="2"/>
      
      <!-- Graph labels -->
      <text x="200" y="305" font-family="monospace" font-size="10" fill="#888" text-anchor="middle">DIVE PROFILE</text>
      
      <!-- Y-axis depth markers -->
      <text x="35" y="220" font-family="monospace" font-size="10" fill="#888" text-anchor="end">100m</text>
      <text x="35" y="245" font-family="monospace" font-size="10" fill="#888" text-anchor="end">50m</text>
      <text x="35" y="270" font-family="monospace" font-size="10" fill="#888" text-anchor="end">0m</text>
      
      <!-- X-axis time markers -->
      <text x="50" y="290" font-family="monospace" font-size="10" fill="#888" text-anchor="middle">0:00</text>
      <text x="200" y="290" font-family="monospace" font-size="10" fill="#888" text-anchor="middle">1:23</text>
      <text x="350" y="290" font-family="monospace" font-size="10" fill="#888" text-anchor="middle">2:46</text>
      
      <!-- Grid lines -->
      <line x1="45" y1="220" x2="45" y2="275" stroke="#333" stroke-width="1"/>
      <line x1="45" y1="275" x2="355" y2="275" stroke="#333" stroke-width="1"/>
      
      <!-- REALISTIC DIVE PROFILE with CLEAR MOUTHFILL PATTERN -->
      <!-- Fast descent to 20m, CLEAR slowdown at 30m for mouthfill, then steady to 96.7m -->
      <path d="M 50 275 
               L 65 255
               L 80 235
               L 95 225
               L 105 225
               L 115 225
               L 125 223
               L 140 221
               L 160 220
               L 180 220
               L 200 221
               L 220 225
               L 240 235
               L 260 250
               L 280 265
               L 320 272
               L 350 275" 
            stroke="#00ff00" 
            stroke-width="3" 
            fill="none"/>
      
      <!-- Highlight mouthfill zone -->
      <circle cx="105" cy="225" r="4" fill="#ff0000"/>
      <text x="115" y="230" font-family="monospace" font-size="8" fill="#ff0000">MOUTHFILL @30m</text>
      
      <!-- Mark bottom time -->
      <line x1="160" y1="220" x2="200" y2="220" stroke="#ffff00" stroke-width="2"/>
      <text x="180" y="235" font-family="monospace" font-size="8" fill="#ffff00">BOTTOM TIME</text>
      
      <!-- Surface interval -->
      <text x="200" y="320" font-family="monospace" font-size="12" fill="#ffff00" text-anchor="middle">SURFACE INTERVAL: 00:17</text>
    </svg>
  `;
  
  const imageBuffer = await sharp(Buffer.from(realDiveComputerSVG))
    .png()
    .resize(800, 600) // Large for detailed analysis
    .toBuffer();
    
  const testImageBase64 = 'data:image/png;base64,' + imageBuffer.toString('base64');
  
  const testData = {
    imageData: testImageBase64,
    userId: '35b522f1-27d2-49de-ed2b-0d257d33ad7d',
    filename: 'detailed-mouthfill-analysis.png',
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
    
    if (response.ok) {
      console.log('✅ Vision Analysis Complete!');
      console.log('');
      console.log('📊 EXTRACTED DATA:');
      console.log(JSON.stringify(result.data.extractedData, null, 2));
      
      console.log('');
      console.log('📈 PROFILE ANALYSIS:');
      console.log(JSON.stringify(result.data.profileAnalysis, null, 2));
      
      console.log('');
      console.log('🎯 TECHNIQUE ANALYSIS:');
      console.log(JSON.stringify(result.data.techniqueAnalysis, null, 2));
      
      console.log('');
      console.log('⚠️ SAFETY ASSESSMENT:');
      console.log(JSON.stringify(result.data.safetyAssessment, null, 2));
      
      console.log('');
      console.log('🏆 COACHING INSIGHTS:');
      console.log(JSON.stringify(result.data.coachingInsights, null, 2));
      
      console.log('');
      console.log(`🤖 AI Confidence: ${result.data.confidence}`);
      console.log(`💰 Tokens Used: ${result.data.tokensUsed}`);
      
      return true;
    } else {
      console.log('❌ Analysis failed:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

testDetailedVisionAnalysis().catch(console.error);
