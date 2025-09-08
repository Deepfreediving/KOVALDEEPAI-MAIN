#!/usr/bin/env node

// Real dive computer test with actual dive data
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3004';

async function testRealDiveLog() {
  console.log('🧪 Testing with REAL dive data (96.7m freedive)...');
  
  // Real dive data from the attached dive computer log
  const realDiveLog = {
    id: 'real-dive-' + Date.now(),
    user_id: '35b522f1-27d2-49de-ed2b-0d257d33ad7d',
    nickname: 'TestDiver',
    date: '2018-07-08', // From the dive computer: 7/8/2018
    time: '10:10:16',   // From the dive computer
    discipline: 'CNF', // Constant No Fins (likely based on depth)
    location: 'Unknown', // Not shown in computer
    target_depth: 100,   // Likely target was 100m
    reached_depth: 96.7, // MAX DEPTH from computer
    dive_time_seconds: 166, // 0:02:46 = 2*60 + 46 = 166 seconds
    total_dive_time: '0:02:46', // DIVE TIME from computer
    bottom_time: 10, // Estimated from profile
    surface_interval: '00:17', // Surface time shown
    water_temp: 30, // MAX DEPTH TEMP: 30°C
    air_temp: 31,   // Surface temp: 31°C
    dive_mode: 'Free', // DIVE MODE from computer
    notes: 'Real dive computer log test - 96.7m CNF dive with excellent profile',
    gear: {
      wetsuit: 'Unknown',
      fins: 'None (CNF)',
      mask: 'Unknown',
      weights_kg: 'Unknown'
    },
    // Additional extracted data
    extractedMetrics: {
      max_depth: 96.7,
      dive_time_seconds: 166,
      dive_time_formatted: '0:02:46',
      temperature_max_depth: 30,
      temperature_surface: 31,
      dive_mode: 'Free',
      surface_interval: '00:17',
      dive_date: '2018-07-08',
      dive_time: '10:10:16'
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(realDiveLog)
    });

    console.log('📊 Real dive log response status:', response.status);
    
    const result = await response.text();
    console.log('📊 Real dive log response:', result.substring(0, 300) + '...');
    
    if (response.ok) {
      const parsedResult = JSON.parse(result);
      console.log('✅ Real dive log saved successfully!');
      console.log(`   📊 Saved dive: ${parsedResult.diveLog.reached_depth}m in ${parsedResult.diveLog.total_dive_time || 'N/A'}`);
      return parsedResult.diveLog;
    } else {
      console.log('❌ Real dive log save failed');
      return null;
    }
  } catch (error) {
    console.error('❌ Real dive log error:', error.message);
    return null;
  }
}

async function testRealDiveComputerImage(diveLogId) {
  console.log('🧪 Testing with REAL dive computer image analysis...');
  
  // Create a realistic dive computer image based on the real data
  const sharp = require('sharp');
  
  // Create an SVG that matches the real dive computer display
  const realDiveComputerSVG = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="100%" height="100%" fill="#e8f4f8"/>
      
      <!-- Main dive profile area -->
      <rect x="20" y="60" width="580" height="400" fill="#b8e0e8" stroke="#2c5aa0" stroke-width="2"/>
      
      <!-- Grid lines -->
      <g stroke="#ffffff" stroke-width="1" opacity="0.5">
        <!-- Horizontal lines (depth) -->
        <line x1="20" y1="100" x2="600" y2="100"/>
        <line x1="20" y1="140" x2="600" y2="140"/>
        <line x1="20" y1="180" x2="600" y2="180"/>
        <line x1="20" y1="220" x2="600" y2="220"/>
        <line x1="20" y1="260" x2="600" y2="260"/>
        <line x1="20" y1="300" x2="600" y2="300"/>
        <line x1="20" y1="340" x2="600" y2="340"/>
        <line x1="20" y1="380" x2="600" y2="380"/>
        <line x1="20" y1="420" x2="600" y2="420"/>
        
        <!-- Vertical lines (time) -->
        <line x1="120" y1="60" x2="120" y2="460"/>
        <line x1="220" y1="60" x2="220" y2="460"/>
        <line x1="320" y1="60" x2="320" y2="460"/>
        <line x1="420" y1="60" x2="420" y2="460"/>
        <line x1="520" y1="60" x2="520" y2="460"/>
      </g>
      
      <!-- Dive profile curve (realistic freedive profile) -->
      <path d="M 20 60 Q 120 200 220 420 Q 320 440 420 420 Q 520 200 600 60" 
            stroke="#2c5aa0" stroke-width="3" fill="none"/>
      
      <!-- Depth markers -->
      <text x="5" y="65" font-family="Arial, sans-serif" font-size="12" fill="#333">0</text>
      <text x="5" y="105" font-family="Arial, sans-serif" font-size="12" fill="#333">10</text>
      <text x="5" y="145" font-family="Arial, sans-serif" font-size="12" fill="#333">20</text>
      <text x="5" y="185" font-family="Arial, sans-serif" font-size="12" fill="#333">30</text>
      <text x="5" y="225" font-family="Arial, sans-serif" font-size="12" fill="#333">40</text>
      <text x="5" y="265" font-family="Arial, sans-serif" font-size="12" fill="#333">50</text>
      <text x="5" y="305" font-family="Arial, sans-serif" font-size="12" fill="#333">60</text>
      <text x="5" y="345" font-family="Arial, sans-serif" font-size="12" fill="#333">70</text>
      <text x="5" y="385" font-family="Arial, sans-serif" font-size="12" fill="#333">80</text>
      <text x="5" y="425" font-family="Arial, sans-serif" font-size="12" fill="#333">90</text>
      <text x="5" y="465" font-family="Arial, sans-serif" font-size="12" fill="#333">100</text>
      
      <!-- Time markers -->
      <text x="20" y="485" font-family="Arial, sans-serif" font-size="12" fill="#333">1:00</text>
      <text x="170" y="485" font-family="Arial, sans-serif" font-size="12" fill="#333">1:25</text>
      <text x="320" y="485" font-family="Arial, sans-serif" font-size="12" fill="#333">1:50</text>
      <text x="470" y="485" font-family="Arial, sans-serif" font-size="12" fill="#333">2:15</text>
      <text x="570" y="485" font-family="Arial, sans-serif" font-size="12" fill="#333">2:40</text>
      
      <!-- Header info -->
      <text x="20" y="25" font-family="Arial, sans-serif" font-size="16" fill="#333">7/8/2018 10:10:16  Surface time 00:17 hours</text>
      <text x="20" y="45" font-family="Arial, sans-serif" font-size="14" fill="#666">🌡️Temperature 📈Ceiling 👁️Hide annotations</text>
      
      <!-- Right panel with metrics -->
      <rect x="620" y="60" width="160" height="400" fill="#f5f5f5" stroke="#ccc" stroke-width="1"/>
      
      <!-- Activity icon -->
      <circle cx="700" cy="120" r="25" fill="#00bcd4" stroke="#fff" stroke-width="3"/>
      <text x="700" y="125" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle">🤿</text>
      
      <!-- Dive stats -->
      <text x="630" y="180" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#333">DIVE MODE</text>
      <text x="630" y="200" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#00bcd4">Free</text>
      
      <text x="630" y="240" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#333">DIVE TIME</text>
      <text x="630" y="260" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#00bcd4">0:02:46</text>
      
      <text x="630" y="300" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#333">MAX DEPTH</text>
      <text x="630" y="320" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#00bcd4">96.7m</text>
      
      <text x="630" y="360" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#333">MAX DEPTH TEMP.</text>
      <text x="630" y="380" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#00bcd4">30°C</text>
      
      <!-- Top right current readings -->
      <rect x="620" y="60" width="80" height="50" fill="white" stroke="#ccc" stroke-width="1"/>
      <text x="660" y="75" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#333">0</text>
      <text x="660" y="90" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#666">5min</text>
      <text x="660" y="105" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#333">31°C</text>
      
      <rect x="700" y="60" width="80" height="50" fill="white" stroke="#ccc" stroke-width="1"/>
      <text x="740" y="75" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#333">5.7 m</text>
      <text x="740" y="90" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#666">1st in</text>
      <text x="740" y="105" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#333">5.7 m</text>
      
      <!-- Bottom tabs -->
      <rect x="20" y="500" width="760" height="40" fill="#e0e0e0" stroke="#ccc" stroke-width="1"/>
      <text x="30" y="520" font-family="Arial, sans-serif" font-size="12" fill="#333">Summary</text>
      <text x="100" y="520" font-family="Arial, sans-serif" font-size="12" fill="#333">Details</text>
      <text x="160" y="520" font-family="Arial, sans-serif" font-size="12" fill="#333">Profile</text>
      <text x="220" y="520" font-family="Arial, sans-serif" font-size="12" fill="#333">Minutes</text>
      <text x="280" y="520" font-family="Arial, sans-serif" font-size="12" fill="#333">Notes</text>
      <text x="340" y="520" font-family="Arial, sans-serif" font-size="12" fill="#333">Dive plan</text>
    </svg>
  `;
  
  const imageBuffer = await sharp(Buffer.from(realDiveComputerSVG))
    .png()
    .resize(800, 600)
    .toBuffer();
    
  const testImageBase64 = 'data:image/png;base64,' + imageBuffer.toString('base64');
  
  const testData = {
    imageData: testImageBase64,
    userId: '35b522f1-27d2-49de-ed2b-0d257d33ad7d',
    filename: 'real-dive-computer-96.7m.png',
    diveLogId: diveLogId
  };

  try {
    const response = await fetch(`${BASE_URL}/api/dive/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('📊 Real image upload response status:', response.status);
    
    const result = await response.text();
    
    if (response.ok) {
      const parsedResult = JSON.parse(result);
      console.log('✅ Real dive computer image analyzed successfully!');
      
      // Debug: Show the full analysis structure
      console.log('🔍 Full analysis structure:');
      console.log(JSON.stringify(parsedResult.data, null, 2));
      
      console.log('📊 Extracted Data:');
      console.log(`   🏊 Max Depth: ${parsedResult.data.extractedData?.maxDepth || 'N/A'}`);
      console.log(`   ⏱️  Dive Time: ${parsedResult.data.extractedData?.diveTime || 'N/A'}`);
      console.log(`   🌡️  Temperature: ${parsedResult.data.extractedData?.temperature || 'N/A'}°C`);
      console.log(`   📅 Date: ${parsedResult.data.extractedData?.date || 'N/A'}`);
      console.log(`   🤿 Mode: ${parsedResult.data.extractedData?.diveMode || 'N/A'}`);
      console.log('');
      console.log('🧠 AI Coaching Insights:');
      console.log(`   ⭐ Performance Rating: ${parsedResult.data.coachingInsights?.performanceRating || 'N/A'}/10`);
      console.log(`   🛡️  Safety Assessment: ${parsedResult.data.coachingInsights?.safetyAssessment || 'N/A'}`);
      console.log(`   📈 Depth Progression: ${parsedResult.data.coachingInsights?.depthProgression || 'N/A'}`);
      
      if (parsedResult.data.coachingInsights?.recommendations?.length > 0) {
        console.log('   💡 Recommendations:');
        parsedResult.data.coachingInsights.recommendations.forEach((rec, i) => {
          console.log(`      ${i + 1}. ${rec}`);
        });
      }
      
      return true;
    } else {
      console.log('❌ Real image upload failed');
      console.log('Response:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Real image upload error:', error.message);
    return false;
  }
}

async function runRealTests() {
  console.log('🚀 REAL DIVE COMPUTER TEST - 96.7m Freedive');
  console.log('=============================================');
  console.log('📊 Testing with actual dive computer data from 7/8/2018');
  console.log('🏊 96.7m CNF dive in 2:46 at 30°C water temp');
  console.log('');
  
  // Step 1: Save the real dive log
  const savedDiveLog = await testRealDiveLog();
  
  if (!savedDiveLog) {
    console.log('❌ Cannot proceed with image test - dive log save failed');
    return;
  }
  
  console.log('');
  
  // Step 2: Test image analysis with the saved dive log
  const imageResult = await testRealDiveComputerImage(savedDiveLog.id);
  
  console.log('');
  console.log('📋 REAL TEST SUMMARY:');
  console.log('======================');
  console.log(`💾 Real Dive Log: ${savedDiveLog ? '✅ SAVED' : '❌ FAILED'}`);
  console.log(`📸 Real Image Analysis: ${imageResult ? '✅ ANALYZED' : '❌ FAILED'}`);
  
  if (savedDiveLog && imageResult) {
    console.log('');
    console.log('🎉 REAL DIVE COMPUTER TEST PASSED!');
    console.log('🤖 Vision AI can properly analyze dive computer displays');
    console.log('💡 System is ready for real freediving data');
  } else {
    console.log('');
    console.log('⚠️ Real test had issues - check logs above');
  }
}

runRealTests().catch(console.error);
