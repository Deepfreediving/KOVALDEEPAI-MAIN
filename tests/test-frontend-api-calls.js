#!/usr/bin/env node

// Test script to verify API endpoints are working
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testSaveDiveLog() {
  console.log('🧪 Testing save-dive-log API...');
  
  // Real dive data matching the computer image: 96.7m dive on 7/8/2018
  const testDiveLog = {
    id: 'a93ffd7d-7f42-4ef2-af77-64fe70549aed', // Match the diveLogId in image test
    user_id: '35b522f1-27d2-49de-ed2b-0d257d33ad7d',
    nickname: 'TestDiver',
    date: '2018-07-08', // Match the date from dive computer
    discipline: 'CNF',
    location: 'Training Site',
    target_depth: 100,
    reached_depth: 96.7, // Match the depth from dive computer
    total_dive_time: 166, // 2:46 in seconds
    notes: 'Deep training dive - 96.7m in 2:46 with mouthfill technique'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testDiveLog)
    });

    console.log('📊 Save dive log response status:', response.status);
    console.log('📊 Save dive log response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.text();
    console.log('📊 Save dive log response body:', result);
    
    if (response.ok) {
      console.log('✅ Save dive log API working');
      return true;
    } else {
      console.log('❌ Save dive log API failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Save dive log API error:', error.message);
    return false;
  }
}

async function testUploadImage() {
  console.log('🧪 Testing upload-image API with REAL dive computer data...');
  
  // Create a realistic dive computer display showing a deep freedive
  const sharp = require('sharp');
  
  // Real dive data: 96.7m dive in 2:46 (from your example)
  const realDiveComputerSVG = `
    <svg width="320" height="240" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="100%" height="100%" fill="#000000"/>
      
      <!-- Screen border -->
      <rect x="5" y="5" width="310" height="230" fill="#001122" stroke="#333" stroke-width="2"/>
      
      <!-- Header with date/time -->
      <text x="160" y="25" font-family="monospace" font-size="10" fill="#00ff00" text-anchor="middle">7/8/2018 10:10:16</text>
      
      <!-- Mode indicator -->
      <text x="30" y="45" font-family="monospace" font-size="12" fill="#ffff00">FREE</text>
      <text x="290" y="45" font-family="monospace" font-size="10" fill="#ffff00" text-anchor="end">BAT:99%</text>
      
      <!-- Main depth display -->
      <text x="160" y="80" font-family="monospace" font-size="32" fill="#00ff00" text-anchor="middle" font-weight="bold">96.7m</text>
      <text x="160" y="100" font-family="monospace" font-size="12" fill="#00ff00" text-anchor="middle">MAX DEPTH</text>
      
      <!-- Time display -->
      <text x="80" y="130" font-family="monospace" font-size="18" fill="#00ff00" text-anchor="middle">2:46</text>
      <text x="80" y="145" font-family="monospace" font-size="10" fill="#00ff00" text-anchor="middle">DIVE TIME</text>
      
      <!-- Temperature -->
      <text x="240" y="130" font-family="monospace" font-size="18" fill="#00ff00" text-anchor="middle">30°C</text>
      <text x="240" y="145" font-family="monospace" font-size="10" fill="#00ff00" text-anchor="middle">TEMP</text>
      
      <!-- Dive profile graph -->
      <rect x="30" y="160" width="260" height="60" fill="#000" stroke="#333" stroke-width="1"/>
      
      <!-- Graph axes -->
      <line x1="35" y1="215" x2="285" y2="215" stroke="#444" stroke-width="1"/>
      <line x1="35" y1="165" x2="35" y2="215" stroke="#444" stroke-width="1"/>
      
      <!-- Depth markers on Y-axis -->
      <text x="25" y="170" font-family="monospace" font-size="8" fill="#666" text-anchor="end">100m</text>
      <text x="25" y="190" font-family="monospace" font-size="8" fill="#666" text-anchor="end">50m</text>
      <text x="25" y="210" font-family="monospace" font-size="8" fill="#666" text-anchor="end">0m</text>
      
      <!-- Time markers on X-axis -->
      <text x="35" y="225" font-family="monospace" font-size="8" fill="#666" text-anchor="start">0:00</text>
      <text x="160" y="225" font-family="monospace" font-size="8" fill="#666" text-anchor="middle">1:23</text>
      <text x="285" y="225" font-family="monospace" font-size="8" fill="#666" text-anchor="end">2:46</text>
      
      <!-- Realistic dive profile curve -->
      <!-- Descent: Fast initial, slowdown at 30m (mouthfill), then steady to 96.7m -->
      <!-- Ascent: Controlled rate back to surface -->
      <path d="M 35 215 
               L 45 200 
               L 55 185
               L 70 170
               L 75 170
               L 80 168
               L 90 166
               L 105 165
               L 115 165
               L 125 166
               L 140 170
               L 160 185
               L 180 200
               L 220 210
               L 285 215" 
            stroke="#00ff00" 
            stroke-width="2" 
            fill="none"/>
      
      <!-- Mark mouthfill zone -->
      <circle cx="75" cy="170" r="2" fill="#ffff00"/>
      <text x="85" y="175" font-family="monospace" font-size="7" fill="#ffff00">MF</text>
      
      <!-- Surface interval indicator -->
      <text x="160" y="235" font-family="monospace" font-size="10" fill="#ffff00" text-anchor="middle">SI: 00:17</text>
    </svg>
  `;
  
  const imageBuffer = await sharp(Buffer.from(realDiveComputerSVG))
    .png()
    .resize(640, 480) // Make it larger for better OCR
    .toBuffer();
    
  const testImageBase64 = 'data:image/png;base64,' + imageBuffer.toString('base64');
  
  // Use corresponding real dive log data
  const testData = {
    imageData: testImageBase64,
    userId: '35b522f1-27d2-49de-ed2b-0d257d33ad7d', // Use proper UUID format
    filename: 'real-dive-96.7m-2018-07-08.png',
    diveLogId: 'a93ffd7d-7f42-4ef2-af77-64fe70549aed' // Use proper UUID format
  };

  try {
    const response = await fetch(`${BASE_URL}/api/dive/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('📊 Upload image response status:', response.status);
    console.log('📊 Upload image response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.text();
    console.log('📊 Upload image response body:', result.substring(0, 500) + (result.length > 500 ? '...' : ''));
    
    if (response.ok) {
      console.log('✅ Upload image API working');
      return true;
    } else {
      console.log('❌ Upload image API failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Upload image API error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Frontend API Tests...');
  console.log('==================================');
  
  const saveResult = await testSaveDiveLog();
  console.log('');
  const uploadResult = await testUploadImage();
  
  console.log('');
  console.log('📋 TEST SUMMARY:');
  console.log(`💾 Save Dive Log: ${saveResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`📸 Upload Image: ${uploadResult ? '✅ PASS' : '❌ FAIL'}`);
  
  if (saveResult && uploadResult) {
    console.log('');
    console.log('🎉 All API tests passed! Frontend should work.');
  } else {
    console.log('');
    console.log('⚠️ Some API tests failed. Check server logs.');
  }
}

runTests().catch(console.error);
