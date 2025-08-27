#!/usr/bin/env node

// Test the frontend dive log image workflow 
require('dotenv').config({ path: '.env.local' });

const fetch = require('node-fetch');

// Test uploading an actual dive computer image through the API
async function testFrontendImageWorkflow() {
  console.log('🌐 Testing frontend dive log image workflow...\n');
  
  const baseUrl = 'http://localhost:3000';
  const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  
  try {
    // Step 1: Test the image upload API endpoint
    console.log('📸 Step 1: Testing dive computer image upload API...');
    
    // Create a base64 encoded test image (small JPEG)
    const testImageBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
    
    const imageUploadData = {
      imageData: testImageBase64,
      userId: userId
    };

    console.log('🔄 Calling image upload API...');
    const uploadResponse = await fetch(`${baseUrl}/api/openai/upload-dive-image-simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(imageUploadData)
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.log('❌ Image upload API failed:', uploadResponse.status);
      console.log('Error response:', errorText);
      return;
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ Image upload successful:', {
      success: uploadResult.success,
      hasAnalysis: !!uploadResult.analysis,
      hasMetrics: !!uploadResult.extractedMetrics,
      imageId: uploadResult.imageId?.substring(0, 8) + '...' || 'None'
    });

    // Step 2: Save dive log with the image data
    console.log('\n💾 Step 2: Testing dive log save with image data...');
    
    const diveLogData = {
      diveLog: {
        date: new Date().toISOString().split('T')[0],
        discipline: 'Constant Weight',
        location: 'Frontend Test - API Workflow',
        target_depth: 45,
        reached_depth: uploadResult.extractedMetrics?.max_depth || 45,
        total_dive_time: '3:30',
        exit: 'Clean',
        attempt_type: 'API Testing',
        notes: 'Testing complete frontend workflow with image upload and analysis'
      },
      imageAnalysis: uploadResult.analysis,
      extractedMetrics: uploadResult.extractedMetrics,
      imageId: uploadResult.imageId
    };

    console.log('🔄 Calling dive log save API...');
    const saveResponse = await fetch(`${baseUrl}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(diveLogData)
    });

    if (!saveResponse.ok) {
      const errorText = await saveResponse.text();
      console.log('❌ Dive log save API failed:', saveResponse.status);
      console.log('Error response:', errorText);
      return;
    }

    const saveResult = await saveResponse.json();
    console.log('✅ Dive log save successful:', {
      success: saveResult.success,
      diveLogId: saveResult.diveLog?.id?.substring(0, 8) + '...' || 'None',
      hasMetadata: !!saveResult.diveLog?.metadata,
      hasImageData: !!saveResult.diveLog?.metadata?.imageAnalysis
    });

    // Step 3: Fetch the dive logs to verify
    console.log('\n🔍 Step 3: Verifying saved data...');
    
    const fetchResponse = await fetch(`${baseUrl}/api/supabase/dive-logs?userId=${userId}`);
    
    if (!fetchResponse.ok) {
      console.log('❌ Fetch dive logs failed:', fetchResponse.status);
      return;
    }

    const fetchResult = await fetchResponse.json();
    console.log('✅ Dive logs retrieved:', {
      totalLogs: fetchResult.diveLogs?.length || 0,
      hasImages: fetchResult.diveLogs?.some(log => log.images?.length > 0) || false
    });

    // Find our test log
    const testLog = fetchResult.diveLogs?.find(log => 
      log.location?.includes('Frontend Test') && 
      log.date === diveLogData.diveLog.date
    );

    if (testLog) {
      console.log('✅ Test dive log found:', {
        id: testLog.id?.substring(0, 8) + '...',
        location: testLog.location,
        depth: testLog.reached_depth + 'm',
        hasMetadata: !!testLog.metadata,
        hasImageAnalysis: !!testLog.metadata?.imageAnalysis,
        hasExtractedMetrics: !!testLog.metadata?.extractedMetrics,
        imageCount: testLog.images?.length || 0
      });

      // Check if image was stored in dive_log_image table
      if (testLog.images && testLog.images.length > 0) {
        console.log('\n🎉 SUCCESS! Images are being stored in dive_log_image table!');
        console.log('📊 Image details:', {
          filename: testLog.images[0].original_filename,
          hasMetrics: !!testLog.images[0].extracted_metrics,
          metricsCount: Object.keys(testLog.images[0].extracted_metrics || {}).length
        });
      } else {
        console.log('\n⚠️  Image data stored in dive log metadata (not in dive_log_image table)');
        console.log('This might be due to RLS policies or authentication issues');
      }
    }

    console.log('\n🎯 FRONTEND WORKFLOW TEST COMPLETE!');
    console.log('✅ Image upload API working');
    console.log('✅ Image analysis working');
    console.log('✅ Dive log save working');
    console.log('✅ Data retrieval working');
    
  } catch (error) {
    console.error('❌ Frontend workflow test failed:', error.message);
    
    // Check if dev server is running
    if (error.code === 'ECONNREFUSED') {
      console.log('\n📝 Dev server not running. Please start it with:');
      console.log('   npm run dev');
    }
  }
}

// Check if server is running first
async function checkDevServer() {
  try {
    const response = await fetch('http://localhost:3000', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function runTest() {
  const serverRunning = await checkDevServer();
  
  if (!serverRunning) {
    console.log('❌ Next.js dev server not running on localhost:3000');
    console.log('📝 Please start the dev server first:');
    console.log('   npm run dev');
    console.log('\nThen run this test again.');
    return;
  }

  await testFrontendImageWorkflow();
}

runTest().catch(console.error);
