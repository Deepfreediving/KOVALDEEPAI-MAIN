#!/usr/bin/env node

// Test the API endpoints now that schema is fixed
require('dotenv').config({ path: '.env.local' });

const fetch = require('node-fetch');

async function testAPIEndpoints() {
  console.log('🧪 Testing API endpoints with complete schema...\n');

  const baseUrl = 'http://localhost:3000'; // Assuming Next.js dev server
  
  try {
    // Test 1: Upload and analyze an image
    console.log('📸 Step 1: Testing image upload and analysis API...');
    
    // Create a simple test image data
    const testImageData = {
      imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    };

    const uploadResponse = await fetch(`${baseUrl}/api/dive/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testImageData)
    });

    if (!uploadResponse.ok) {
      console.log('❌ Image upload API failed:', uploadResponse.status);
      const errorText = await uploadResponse.text();
      console.log('Error:', errorText);
    } else {
      const uploadResult = await uploadResponse.json();
      console.log('✅ Image upload successful:', {
        success: uploadResult.success,
        hasAnalysis: !!uploadResult.analysis,
        hasMetrics: !!uploadResult.extractedMetrics,
        imageId: uploadResult.imageId
      });

      // Test 2: Save a dive log with the image
      console.log('\n💾 Step 2: Testing dive log save API...');

      const diveLogData = {
        diveLog: {
          date: '2025-08-26',
          discipline: 'Constant Weight No Fins',
          location: 'API Test Pool',
          target_depth: 25,
          reached_depth: uploadResult.extractedMetrics?.max_depth || 25,
          total_dive_time: '3:30',
          exit: 'Clean',
          attempt_type: 'Training',
          notes: 'API test with extracted metrics'
        },
        imageAnalysis: uploadResult.analysis,
        extractedMetrics: uploadResult.extractedMetrics,
        imageId: uploadResult.imageId
      };

      const saveResponse = await fetch(`${baseUrl}/api/supabase/save-dive-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(diveLogData)
      });

      if (!saveResponse.ok) {
        console.log('❌ Dive log save API failed:', saveResponse.status);
        const errorText = await saveResponse.text();
        console.log('Error:', errorText);
      } else {
        const saveResult = await saveResponse.json();
        console.log('✅ Dive log save successful:', {
          success: saveResult.success,
          diveLogId: saveResult.diveLog?.id,
          hasMetadata: !!saveResult.diveLog?.metadata
        });

        // Test 3: Fetch dive logs
        console.log('\n🔍 Step 3: Testing dive logs fetch API...');

        const fetchResponse = await fetch(`${baseUrl}/api/supabase/dive-logs?userId=f47ac10b-58cc-4372-a567-0e02b2c3d479`);

        if (!fetchResponse.ok) {
          console.log('❌ Dive logs fetch API failed:', fetchResponse.status);
        } else {
          const fetchResult = await fetchResponse.json();
          console.log('✅ Dive logs fetch successful:', {
            count: fetchResult.diveLogs?.length || 0,
            hasImages: fetchResult.diveLogs?.some(log => log.images?.length > 0)
          });

          // Find our test dive log
          const testLog = fetchResult.diveLogs?.find(log => 
            log.location === 'API Test Pool' && 
            log.date === '2025-08-26'
          );

          if (testLog) {
            console.log('✅ Found test dive log:', {
              id: testLog.id,
              depth: testLog.reached_depth,
              hasImages: !!testLog.images?.length,
              hasMetrics: !!testLog.metadata?.extractedMetrics
            });
          }
        }

        console.log('\n🎉 All API tests completed successfully!');
      }
    }

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

// Check if Next.js dev server is running
async function checkDevServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health', { timeout: 5000 });
    return response.ok;
  } catch {
    return false;
  }
}

async function runAPITests() {
  const isServerRunning = await checkDevServer();
  
  if (!isServerRunning) {
    console.log('❌ Next.js dev server not running on localhost:3000');
    console.log('📝 Please start the dev server with: npm run dev');
    console.log('Then run this test again.');
    return;
  }

  await testAPIEndpoints();
}

runAPITests().catch(console.error);
