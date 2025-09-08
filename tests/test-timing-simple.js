#!/usr/bin/env node

// Simple test with a working PNG image and valid enum
const fetch = require('node-fetch');
const sharp = require('sharp');

const BASE_URL = 'http://localhost:3000';
const USER_ID = '35b522f1-27d2-49de-ed2b-0d257d33ad7d';

async function testWithWorkingImage() {
  console.log('🧪 Testing with Working PNG Image & Valid Enums');
  console.log('=' .repeat(60));
  
  try {
    // Create a simple PNG test image using Sharp
    console.log('📸 Creating test PNG image...');
    const imageBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 0, g: 20, b: 50 }
      }
    })
    .png()
    .composite([
      {
        input: Buffer.from(`
          <svg width="800" height="600">
            <rect width="100%" height="100%" fill="rgba(0,20,50,0)"/>
            <text x="400" y="100" text-anchor="middle" fill="white" font-size="24">DIVE COMPUTER</text>
            <text x="400" y="200" text-anchor="middle" fill="yellow" font-size="36">MAX: 87.5m</text>
            <text x="400" y="250" text-anchor="middle" fill="yellow" font-size="24">TIME: 3:42</text>
            <text x="400" y="300" text-anchor="middle" fill="cyan" font-size="18">TEMP: 25°C</text>
            <rect x="100" y="350" width="600" height="200" fill="none" stroke="cyan" stroke-width="2"/>
            <polyline points="120,450 200,400 300,380 400,370 500,380 600,400 680,450" 
                     fill="none" stroke="lime" stroke-width="3"/>
          </svg>
        `),
        top: 0,
        left: 0
      }
    ])
    .toBuffer();
    
    console.log(`📏 Created PNG: ${Math.round(imageBuffer.length / 1024)}KB`);
    
    // Step 1: Save dive log with VALID enum values
    console.log('\n📝 Step 1: Saving dive log with valid enums...');
    const diveLogData = {
      id: `timing-test-${Date.now()}`,
      user_id: USER_ID,
      date: new Date().toISOString().split('T')[0],
      discipline: "CWT", // Valid enum
      location: "Test Location",
      targetDepth: "87",
      reachedDepth: "87",
      totalDiveTime: "3:42",
      surfaceProtocol: null, // Avoid enum issue
      exit: null, // Avoid enum issue  
      notes: "Timing test with valid data"
    };
    
    const logStartTime = Date.now();
    const logResponse = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(diveLogData)
    });
    
    const logTime = Date.now() - logStartTime;
    console.log(`⏱️  Log Save Time: ${logTime}ms`);
    console.log(`📊 Log Save Status: ${logResponse.status}`);
    
    if (!logResponse.ok) {
      const logError = await logResponse.text();
      console.log(`❌ Log save failed: ${logError}`);
      return;
    }
    
    const savedLog = await logResponse.json();
    const savedLogId = savedLog.data?.id || savedLog.diveLog?.id;
    console.log(`✅ Log saved: ${savedLogId}`);
    
    // Step 2: Upload image with detailed timing
    console.log('\n📸 Step 2: Uploading PNG image...');
    const imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    
    const imageStartTime = Date.now();
    console.log(`🚀 Image upload started at: ${new Date().toISOString()}`);
    
    const imageResponse = await fetch(`${BASE_URL}/api/dive/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: imageBase64,
        userId: USER_ID,
        filename: 'timing-test.png',
        diveLogId: savedLogId
      })
    });
    
    const imageTime = Date.now() - imageStartTime;
    console.log(`⏹️  Image upload finished at: ${new Date().toISOString()}`);
    console.log(`⏱️  Total Image Time: ${imageTime}ms (${(imageTime/1000).toFixed(2)}s)`);
    console.log(`📊 Image Status: ${imageResponse.status}`);
    
    if (imageResponse.ok) {
      const imageResult = await imageResponse.json();
      console.log(`✅ Image Success:`);
      console.log(`   - Tokens: ${imageResult.data?.tokensUsed}`);
      console.log(`   - Max Depth: ${imageResult.data?.extractedMetrics?.max_depth}`);
      console.log(`   - Timing: ${JSON.stringify(imageResult.data?.timing || {})}`);
      
      // Analyze timing
      if (imageTime > 20000) {
        console.log('\n🚨 EXTREMELY SLOW! (20+ seconds)');
        console.log('Possible causes:');
        console.log('- OpenAI API rate limiting');
        console.log('- Network connectivity issues'); 
        console.log('- Large prompt causing slow processing');
        console.log('- Multiple retries happening');
      } else if (imageTime > 10000) {
        console.log('\n⚠️  Slower than expected (10+ seconds)');
      } else {
        console.log('\n✅ Normal processing time');
      }
      
    } else {
      const imageError = await imageResponse.text();
      console.log(`❌ Image failed: ${imageError.substring(0, 300)}...`);
    }
    
    console.log('\n🎯 TIMING SUMMARY');
    console.log(`Log Save: ${logTime}ms`);
    console.log(`Image Processing: ${imageTime}ms`);
    console.log(`Total: ${logTime + imageTime}ms`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWithWorkingImage();
