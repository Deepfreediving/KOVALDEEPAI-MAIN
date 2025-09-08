#!/usr/bin/env node

// Test OpenAI Vision API directly
require('dotenv').config();
const OpenAI = require('openai');

async function testOpenAIVision() {
  console.log('🧪 Testing OpenAI Vision API directly...');
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    return false;
  }
  
  console.log('✅ OpenAI API key found');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Create a larger test image (50x50 blue square with some text-like patterns)
  const testImageBase64 = await createTestDiveComputerImage();

  const analysisPrompt = `Analyze this image and extract any visible information. Return a JSON response with:
{
  "description": "What you see in the image",
  "confidence": "high|medium|low"
}`;

  try {
    console.log('🤖 Making OpenAI Vision API call...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${testImageBase64}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1
    });

    const result = response.choices[0].message.content;
    console.log('✅ OpenAI Vision API response:', result);
    console.log('🏷️ Tokens used:', response.usage?.total_tokens || 'unknown');
    
    return true;
  } catch (error) {
    console.error('❌ OpenAI Vision API error:', error.message);
    if (error.response) {
      console.error('📄 Error details:', error.response.data);
    }
    return false;
  }
}

async function testImageProcessing() {
  console.log('🧪 Testing image processing pipeline...');
  
  const sharp = require('sharp');
  
  // Test with a real PNG
  const testImageBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABYSURBVBiVY2RgYGBgYmJiQAKMjIwMDAwMDExMTAz///9nYGBgYGBkZGRgYGBgYGBgZGRkYGBgYGBgZGRkYGBgYGBgZGRkQAWMjIwMKACJMTAwMKACGBgYGBgAAF8AEQGOl8X8AAAAAElFTkSuQmCC`;
  
  try {
    const imageBuffer = Buffer.from(testImageBase64, 'base64');
    console.log('📏 Original image size:', imageBuffer.length, 'bytes');
    
    const optimized = await sharp(imageBuffer)
      .resize(1920, 1080, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 80, 
        progressive: true 
      })
      .toBuffer();
    
    console.log('📏 Optimized image size:', optimized.length, 'bytes');
    console.log('✅ Image processing works fine');
    
    return optimized;
  } catch (error) {
    console.error('❌ Image processing error:', error.message);
    return null;
  }
}

// Create a proper test dive computer image
async function createTestDiveComputerImage() {
  const sharp = require('sharp');
  
  // Create a 200x150 image that simulates a dive computer display
  const width = 200;
  const height = 150;
  
  // Create SVG content that looks like a dive computer
  const svgImage = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#001122"/>
      <rect x="10" y="10" width="${width-20}" height="${height-20}" fill="#000000" stroke="#00ff00" stroke-width="2"/>
      <text x="100" y="40" font-family="monospace" font-size="24" fill="#00ff00" text-anchor="middle">25.5m</text>
      <text x="100" y="65" font-family="monospace" font-size="16" fill="#00ff00" text-anchor="middle">MAX DEPTH</text>
      <text x="100" y="90" font-family="monospace" font-size="20" fill="#00ff00" text-anchor="middle">2:35</text>
      <text x="100" y="110" font-family="monospace" font-size="14" fill="#00ff00" text-anchor="middle">DIVE TIME</text>
      <text x="100" y="130" font-family="monospace" font-size="12" fill="#00ff00" text-anchor="middle">TEMP: 23°C</text>
    </svg>
  `;
  
  try {
    const buffer = await sharp(Buffer.from(svgImage))
      .png()
      .toBuffer();
    
    return buffer.toString('base64');
  } catch (error) {
    console.error('Failed to create test image:', error);
    // Fallback to a simple pattern
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAFITuFrAAAAAElFTkSuQmCC';
  }
}

async function runVisionTests() {
  console.log('🚀 Starting OpenAI Vision API Tests...');
  console.log('=====================================');
  
  // Test 1: Image processing
  const processedImage = await testImageProcessing();
  console.log('');
  
  // Test 2: OpenAI Vision API
  const visionResult = await testOpenAIVision();
  
  console.log('');
  console.log('📋 VISION TEST SUMMARY:');
  console.log(`🖼️ Image Processing: ${processedImage ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`👁️ OpenAI Vision API: ${visionResult ? '✅ PASS' : '❌ FAIL'}`);
  
  if (processedImage && visionResult) {
    console.log('');
    console.log('🎉 Vision pipeline is working! The issue is likely elsewhere.');
  } else {
    console.log('');
    console.log('⚠️ Vision pipeline has issues. Check API keys and model access.');
  }
}

runVisionTests().catch(console.error);
