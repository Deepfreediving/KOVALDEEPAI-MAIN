#!/usr/bin/env node

// Test with a much shorter prompt to see if prompt length is the issue
const fetch = require('node-fetch');
const sharp = require('sharp');

const BASE_URL = 'http://localhost:3000';

async function testShortPrompt() {
  console.log('🔍 Testing Short vs Long Prompt Performance');
  console.log('=' .repeat(50));
  
  // Create simple test image
  const imageBuffer = await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 3,
      background: { r: 0, g: 50, b: 100 }
    }
  })
  .png()
  .composite([
    {
      input: Buffer.from(`
        <svg width="400" height="300">
          <text x="200" y="100" text-anchor="middle" fill="white" font-size="20">45.2m</text>
          <text x="200" y="150" text-anchor="middle" fill="yellow" font-size="16">2:30</text>
        </svg>
      `),
      top: 0,
      left: 0
    }
  ])
  .toBuffer();

  console.log(`📏 Image size: ${Math.round(imageBuffer.length / 1024)}KB`);

  // Test directly with OpenAI API using a simple prompt
  console.log('\n🧪 Testing with SHORT prompt...');
  
  const shortPromptTest = {
    imageData: `data:image/png;base64,${imageBuffer.toString('base64')}`,
    shortPrompt: true // This will trigger a short prompt in the API
  };
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/dive/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shortPromptTest)
    });
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Short Prompt Time: ${duration}ms (${(duration/1000).toFixed(2)}s)`);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Short Prompt Success - Tokens: ${result.data?.tokensUsed}`);
    } else {
      const error = await response.text();
      console.log(`❌ Short Prompt Failed: ${error.substring(0, 100)}...`);
    }
    
  } catch (error) {
    console.error('❌ Short prompt test failed:', error.message);
  }
}

async function testOpenAIDirectly() {
  console.log('\n🔬 Testing OpenAI API Directly (bypassing our app)');
  console.log('-'.repeat(50));
  
  // You can only do this if you have direct access to OpenAI API key
  console.log('This would require direct OpenAI API call...');
  console.log('Expected response time should be 2-5 seconds for simple images');
  console.log('If our app takes 20+ seconds, there is a bottleneck in our code');
}

async function runPromptTests() {
  await testShortPrompt();
  await testOpenAIDirectly();
  
  console.log('\n📊 ANALYSIS:');
  console.log('If short prompt is still slow (15+ sec), the issue is:');
  console.log('1. Network connectivity to OpenAI');
  console.log('2. OpenAI API rate limiting'); 
  console.log('3. Our OpenAI client configuration');
  console.log('');
  console.log('If short prompt is fast (<5 sec), the issue is:');
  console.log('1. Our long prompt is too complex');
  console.log('2. Requesting too much analysis');
  console.log('3. JSON parsing complexity');
}

runPromptTests();
