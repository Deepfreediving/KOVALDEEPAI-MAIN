#!/usr/bin/env node

// Test to investigate the 23-second processing time issue
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const USER_ID = '35b522f1-27d2-49de-ed2b-0d257d33ad7d';

async function testProcessingSpeed() {
  console.log('⏱️  PROCESSING SPEED INVESTIGATION');
  console.log('=' .repeat(50));
  
  // Test different image sizes and formats
  const tests = [
    {
      name: 'Tiny Base64 (100x100)',
      createImage: () => {
        const tiny = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#000"/>
          <text x="50" y="50" text-anchor="middle" fill="#fff" font-size="12">45m</text>
        </svg>`;
        return `data:image/svg+xml;base64,${Buffer.from(tiny).toString('base64')}`;
      }
    },
    {
      name: 'Small Base64 (400x300)',
      createImage: () => {
        const small = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#001122"/>
          <text x="200" y="100" text-anchor="middle" fill="#00ff99" font-size="20">MAX: 87.5m</text>
          <text x="200" y="130" text-anchor="middle" fill="#ffff00" font-size="16">TIME: 3:42</text>
          <rect x="50" y="150" width="300" height="100" fill="#000044"/>
          <polyline points="60,200 150,240 250,200 340,160" fill="none" stroke="#00ff99" stroke-width="2"/>
        </svg>`;
        return `data:image/svg+xml;base64,${Buffer.from(small).toString('base64')}`;
      }
    },
    {
      name: 'Large Base64 (1200x800)',
      createImage: () => {
        const large = `<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#000033"/>
          <text x="600" y="100" text-anchor="middle" fill="#00ff99" font-size="32">ORCA DIVE COMPUTER</text>
          <text x="300" y="200" text-anchor="middle" fill="#ffff00" font-size="48">MAX DEPTH</text>
          <text x="300" y="280" text-anchor="middle" fill="#ffff00" font-size="72">103.6m</text>
          <text x="900" y="200" text-anchor="middle" fill="#00ffff" font-size="32">TIME: 03:45</text>
          <text x="900" y="250" text-anchor="middle" fill="#00ffff" font-size="24">TEMP: 23°C</text>
          <rect x="100" y="350" width="1000" height="350" fill="#000066" stroke="#0099cc"/>
          <polyline points="150,400 300,500 450,600 600,650 750,600 900,500 1050,400" fill="none" stroke="#00ff99" stroke-width="4"/>
          <!-- Add many details -->
          ${Array.from({length: 20}, (_, i) => 
            `<text x="${150 + i*50}" y="720" fill="#666" font-size="10">${i}:00</text>`
          ).join('')}
        </svg>`;
        return `data:image/svg+xml;base64,${Buffer.from(large).toString('base64')}`;
      }
    }
  ];
  
  for (const test of tests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log('-'.repeat(30));
    
    try {
      const imageData = test.createImage();
      console.log(`📏 Image size: ${Math.round(imageData.length / 1024)}KB`);
      
      // Time the request
      const startTime = Date.now();
      console.log(`🚀 Starting at: ${new Date(startTime).toISOString()}`);
      
      const response = await fetch(`${BASE_URL}/api/dive/upload-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageData,
          userId: USER_ID,
          filename: `speed-test-${test.name.toLowerCase().replace(/\s+/g, '-')}.svg`
        })
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏹️  Finished at: ${new Date(endTime).toISOString()}`);
      console.log(`⏱️  Duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);
      console.log(`📊 Status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.text();
        try {
          const data = JSON.parse(result);
          console.log(`✅ Success - Tokens: ${data.data?.tokensUsed || 'Unknown'}`);
          console.log(`🧠 Confidence: ${data.data?.analysis?.confidence || 'Unknown'}`);
          console.log(`📝 Response size: ${Math.round(result.length / 1024)}KB`);
        } catch (e) {
          console.log(`❌ Invalid JSON response`);
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Failed: ${errorText.substring(0, 100)}...`);
      }
      
      // Flag slow responses
      if (duration > 15000) {
        console.log(`🚨 SLOW RESPONSE DETECTED! (${(duration/1000).toFixed(1)}s)`);
      } else if (duration > 5000) {
        console.log(`⚠️  Slower than expected (${(duration/1000).toFixed(1)}s)`);
      } else {
        console.log(`✅ Normal speed (${(duration/1000).toFixed(1)}s)`);
      }
      
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
    }
  }
  
  console.log('\n📈 SPEED ANALYSIS COMPLETE');
  console.log('=' .repeat(50));
  console.log('Expected OpenAI Vision API response times:');
  console.log('- Simple images: 2-5 seconds');
  console.log('- Complex images: 5-10 seconds');  
  console.log('- Very complex: 10-15 seconds');
  console.log('- 20+ seconds: Something is wrong!');
}

async function testAPIEndpointTiming() {
  console.log('\n🔍 API ENDPOINT TIMING BREAKDOWN');
  console.log('=' .repeat(50));
  
  // Test each step individually
  const steps = [
    {
      name: 'Health Check',
      url: `${BASE_URL}/api/health`,
      method: 'GET'
    },
    {
      name: 'Save Dive Log Only',
      url: `${BASE_URL}/api/supabase/save-dive-log`,
      method: 'POST',
      body: {
        user_id: USER_ID,
        date: new Date().toISOString().split('T')[0],
        discipline: "Speed Test",
        location: "Test",
        targetDepth: "50",
        notes: "Timing test"
      }
    }
  ];
  
  for (const step of steps) {
    console.log(`\n⏱️  Testing: ${step.name}`);
    
    try {
      const startTime = Date.now();
      
      const options = {
        method: step.method,
        headers: step.body ? { 'Content-Type': 'application/json' } : {}
      };
      
      if (step.body) {
        options.body = JSON.stringify(step.body);
      }
      
      const response = await fetch(step.url, options);
      const duration = Date.now() - startTime;
      
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.text();
        console.log(`   Response: ${result.length} chars`);
      }
      
    } catch (error) {
      console.error(`   Error: ${error.message}`);
    }
  }
}

// Run both tests
async function runAllTests() {
  await testProcessingSpeed();
  await testAPIEndpointTiming();
}

runAllTests();
