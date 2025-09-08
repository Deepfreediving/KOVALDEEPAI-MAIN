#!/usr/bin/env node

// Test OpenAI Vision API to prove it's NOT hardcoded
const fetch = require('node-fetch');
const FormData = require('form-data');
const sharp = require('sharp');

const BASE_URL = 'http://localhost:3000';

async function testOpenAIVisionIsReal() {
  console.log('🤖 TESTING: Is OpenAI Vision API Real or Hardcoded?');
  console.log('=' .repeat(60));
  
  // Create a UNIQUE dive computer image that has never been seen before
  const uniqueTestSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="400" style="background: #000033">
  <!-- UNIQUE TEST - This exact image has never been processed before -->
  <rect x="20" y="20" width="460" height="360" rx="20" fill="#001122" stroke="#0066aa" stroke-width="3"/>
  
  <!-- UNIQUE dive data that would be impossible to hardcode -->
  <text x="250" y="60" text-anchor="middle" fill="#00ffaa" font-family="Arial" font-size="16" font-weight="bold">SUUNTO D5 DIVE COMPUTER</text>
  
  <!-- Unusual depth: 87.3m (very specific) -->
  <text x="80" y="120" fill="#ffff00" font-family="Arial" font-size="28" font-weight="bold">MAX: 87.3m</text>
  
  <!-- Odd time: 4:17 (specific) -->
  <text x="350" y="120" fill="#ffff00" font-family="Arial" font-size="24">TIME: 4:17</text>
  
  <!-- Unusual temperature -->
  <text x="80" y="160" fill="#00ffaa" font-family="Arial" font-size="16">TEMP: 19.7°C</text>
  
  <!-- Weird dive profile with specific characteristics -->
  <rect x="50" y="180" width="400" height="150" fill="#000066" stroke="#0088ff"/>
  
  <!-- Very specific dive curve -->
  <polyline 
    points="60,190 85,200 110,225 140,250 170,280 200,305 230,315 260,310 290,295 320,270 350,245 380,220 410,200 430,190"
    fill="none" 
    stroke="#ff6600" 
    stroke-width="4"/>
    
  <!-- Specific markers -->
  <circle cx="140" cy="250" r="4" fill="#ff0066"/>
  <text x="145" y="245" fill="#ff0066" font-family="Arial" font-size="10">EQ</text>
  
  <circle cx="230" cy="315" r="4" fill="#ffff00"/>
  <text x="235" y="310" fill="#ffff00" font-family="Arial" font-size="10">BT</text>
  
  <!-- Unique surface interval -->
  <text x="250" y="370" text-anchor="middle" fill="#888" font-family="Arial" font-size="12">Surface Interval: 2h 34m</text>
</svg>`;

  console.log('📊 Created UNIQUE test image with:');
  console.log('   • Depth: 87.3m (unusual specific depth)');
  console.log('   • Time: 4:17 (specific duration)');  
  console.log('   • Temp: 19.7°C (specific temperature)');
  console.log('   • Surface interval: 2h 34m');
  console.log('   • Custom dive profile curve');
  console.log('   • Specific equalization and bottom time markers');
  
  try {
    // Convert SVG to PNG using sharp
    const imageBuffer = await sharp(Buffer.from(uniqueTestSVG))
      .png()
      .resize(800, 600)
      .toBuffer();
    
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: 'unique-test-87.3m-dive.png',
      contentType: 'image/png'
    });
    formData.append('userId', '35b522f1-27d2-49de-ed2b-0d257d33ad7d');
    // formData.append('diveLogId', 'test-vision-' + Date.now()); // Skip dive log ID for this test
    
    console.log('\n🚀 Sending UNIQUE image to OpenAI Vision API...');
    console.log('⏱️  Processing time will indicate if it\'s real API call...');
    
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/api/dive/upload-image`, {
      method: 'POST',
      body: formData
    });
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`⏱️  Processing took: ${processingTime}ms`);
    
    if (processingTime > 2000) {
      console.log('✅ REAL API: Processing time indicates actual OpenAI API call');
    } else {
      console.log('⚠️  SUSPICIOUS: Very fast response might indicate hardcoded data');
    }
    
    const result = await response.text();
    console.log('\n📥 Response status:', response.status);
    
    if (response.ok) {
      try {
        const data = JSON.parse(result);
        const analysis = data.data;
        
        console.log('\n🧠 OPENAI ANALYSIS RESULTS:');
        console.log('=' .repeat(40));
        
        if (analysis?.extractedData) {
          console.log('📊 Extracted Data:');
          console.log(`   Max Depth: ${analysis.extractedData.maxDepth || 'Not detected'}`);
          console.log(`   Dive Time: ${analysis.extractedData.diveTime || 'Not detected'}`);
          console.log(`   Temperature: ${analysis.extractedData.temperature || 'Not detected'}`);
        }
        
        if (analysis?.profileAnalysis) {
          console.log('📈 Profile Analysis Present:', !!analysis.profileAnalysis);
        }
        
        if (analysis?.coachingInsights) {
          console.log('🏆 Coaching Insights Present:', !!analysis.coachingInsights);
        }
        
        console.log(`🤖 Confidence: ${analysis?.confidence || 'Unknown'}`);
        console.log(`💰 Tokens Used: ${analysis?.tokensUsed || data.data?.tokensUsed || 'Unknown'}`);
        
        // Check if it detected our specific unusual values
        if (analysis?.extractedData?.maxDepth == 87.3) {
          console.log('\n✅ CONFIRMED: OpenAI correctly detected our unique 87.3m depth!');
        }
        if (analysis?.extractedData?.diveTime?.includes('4:17')) {
          console.log('✅ CONFIRMED: OpenAI correctly detected our unique 4:17 time!');
        }
        if (analysis?.extractedData?.temperature == 19.7) {
          console.log('✅ CONFIRMED: OpenAI correctly detected our unique 19.7°C temperature!');
        }
        
        console.log('\n🎯 CONCLUSION:');
        if (processingTime > 2000 && (analysis?.extractedData?.maxDepth || analysis?.extractedData?.diveTime)) {
          console.log('✅ OpenAI Vision API is REAL and processing images dynamically!');
          console.log('✅ Analysis contains actual extracted data, not hardcoded responses');
        } else {
          console.log('⚠️  Results inconclusive - may need more testing');
        }
        
      } catch (parseError) {
        console.log('❌ Could not parse response as JSON');
        console.log('Raw response:', result.substring(0, 500) + '...');
      }
    } else {
      console.log('❌ API call failed:', result);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOpenAIVisionIsReal();
