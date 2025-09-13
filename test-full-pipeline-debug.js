#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config();

async function testFullPipeline() {
  console.log('🧪 Testing full pipeline: Image Upload → Metrics Extraction → Save to Database → Retrieve\n');
  
  const imagePath = path.join(process.cwd(), 'public', 'freedive log', 'Deepest dive on new mooring BO on surface and squeeze from bottom turn  121320 112m.JPG');
  
  if (!fs.existsSync(imagePath)) {
    console.error('❌ Image not found:', imagePath);
    return;
  }

  try {
    // Step 1: Test Image Upload and Analysis
    console.log('📤 Step 1: Upload image for analysis...');
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    form.append('userId', 'test-full-pipeline');

    const uploadResponse = await fetch('http://localhost:3001/api/dive/upload-image', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error('❌ Upload failed:', uploadResponse.status, error);
      return;
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ Upload successful');
    console.log('📊 Extracted Metrics:', JSON.stringify(uploadResult.data.extractedMetrics, null, 2));
    
    // Step 2: Test Dive Log Save with Metrics
    console.log('\n📝 Step 2: Save dive log with extracted metrics...');
    
    const diveLogPayload = {
      user_id: 'test-full-pipeline',
      date: '2025-09-11',
      location: 'Test Location',
      discipline: 'CWT',
      notes: 'Testing full pipeline with real image metrics',
      
      // Include the extracted metrics and image data
      extractedMetrics: uploadResult.data.extractedMetrics,
      imageId: uploadResult.data.imageId,
      imageUrl: uploadResult.data.imageUrl,
      imageAnalysis: uploadResult.data.profileAnalysis,
    };
    
    console.log('🎯 Payload extractedMetrics:', diveLogPayload.extractedMetrics);
    
    const saveResponse = await fetch('http://localhost:3001/api/supabase/save-dive-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(diveLogPayload)
    });
    
    if (!saveResponse.ok) {
      const error = await saveResponse.text();
      console.error('❌ Save failed:', saveResponse.status, error);
      return;
    }
    
    const saveResult = await saveResponse.json();
    console.log('✅ Save successful');
    console.log('💾 Saved dive log ID:', saveResult.data?.id);
    
    // Step 3: Retrieve and Verify
    console.log('\n🔍 Step 3: Retrieve saved dive log to verify depth...');
    
    const retrieveResponse = await fetch(`http://localhost:3001/api/dive/batch-logs?userId=test-full-pipeline`);
    
    if (retrieveResponse.ok) {
      const retrieveResult = await retrieveResponse.json();
      const savedLog = retrieveResult.diveLogs?.find(log => log.id === saveResult.data?.id);
      
      if (savedLog) {
        console.log('✅ Retrieved saved dive log:');
        console.log(`   📏 Reached Depth: ${savedLog.reached_depth}m (should be 112m)`);
        console.log(`   ⏱️  Total Time: ${savedLog.total_dive_time}s (should be 192s)`);
        console.log(`   🌊 Location: ${savedLog.location}`);
        console.log(`   📅 Date: ${savedLog.date}`);
        
        if (savedLog.reached_depth === 112) {
          console.log('🎉 SUCCESS: Depth correctly saved as 112m!');
        } else {
          console.log(`❌ FAILURE: Depth is ${savedLog.reached_depth}m, expected 112m`);
        }
        
        // Check for image association
        if (uploadResult.data.imageId) {
          console.log(`\n🖼️  Step 4: Check image association (Image ID: ${uploadResult.data.imageId})`);
          // TODO: Add image retrieval test
        }
      } else {
        console.log('❌ Could not find saved dive log in retrieval');
      }
    } else {
      console.log('❌ Could not retrieve dive logs');
    }
    
  } catch (error) {
    console.error('❌ Pipeline test failed:', error.message);
  }
}

// Check if server is running first
fetch('http://localhost:3001/api/health')
  .then(() => {
    console.log('✅ Server is running, starting pipeline test...\n');
    testFullPipeline();
  })
  .catch(() => {
    console.log('❌ Server not running. Start with: cd apps/web && npm run dev');
  });
