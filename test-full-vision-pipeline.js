#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config();

async function testFullVisionPipeline() {
  console.log('🧪 Testing full Vision API pipeline (API endpoint)...\n');
  
  const imagePath = path.join(process.cwd(), 'public', 'freedive log', 'Deepest dive on new mooring BO on surface and squeeze from bottom turn  121320 112m.JPG');
  
  if (!fs.existsSync(imagePath)) {
    console.error('❌ Image not found:', imagePath);
    return;
  }

  // Create form data
  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath));

  try {
    console.log('📤 Calling /api/dive/upload-image endpoint...');
    
    const response = await fetch('http://localhost:3000/api/dive/upload-image', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ API Response received');
    console.log('─'.repeat(50));
    console.log(JSON.stringify(result, null, 2));
    console.log('─'.repeat(50));
    
    // Check if the frontend mapping worked
    if (result.success && result.data?.extractedMetrics) {
      const metrics = result.data.extractedMetrics;
      console.log('\n📊 Frontend-Ready Metrics:');
      console.log(`  max_depth: ${metrics.max_depth} (should be 112)`);
      console.log(`  dive_time_formatted: ${metrics.dive_time_formatted} (should be 03:12)`);
      console.log(`  temperature: ${metrics.temperature} (should have 31°C)`);
      console.log(`  dive_date: ${metrics.dive_date} (should have timestamp)`);
      
      // Advanced metrics
      if (metrics.descent_time) console.log(`  descent_time: ${metrics.descent_time}`);
      if (metrics.ascent_time) console.log(`  ascent_time: ${metrics.ascent_time}`);
      if (metrics.descent_rate) console.log(`  descent_rate: ${metrics.descent_rate} m/min`);
      if (metrics.ascent_rate) console.log(`  ascent_rate: ${metrics.ascent_rate} m/min`);
      if (metrics.hang_time) console.log(`  hang_time: ${metrics.hang_time}s`);
      if (metrics.confidence) console.log(`  confidence: ${metrics.confidence}`);
      
      // Test the frontend message format
      console.log('\n💬 Frontend Message Preview:');
      console.log(`🎯 **Image Analysis Complete**

Extracted dive data:
- **Depth**: ${metrics.max_depth || 'N/A'}m
- **Time**: ${metrics.dive_time_formatted || 'N/A'}
- **Temperature**: ${metrics.temperature || 'N/A'}°C
- **Date**: ${metrics.dive_date || 'N/A'}`);
      
    } else {
      console.error('❌ No extracted metrics in response');
    }
    
  } catch (error) {
    console.error('❌ Pipeline test failed:', error.message);
  }
}

testFullVisionPipeline();
