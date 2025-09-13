#!/usr/bin/env node

/**
 * Test script to verify that dive log images are properly saved and loaded during editing
 * This test will:
 * 1. Save a dive log with an image
 * 2. Load the dive log back from database 
 * 3. Verify the image is still associated
 * 4. Test the edit mode functionality
 */

const fs = require('fs');
const path = require('path');

async function testDiveLogImagePersistence() {
  console.log('🧪 Testing Dive Log Image Persistence Fix\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test with actual dive computer image
    const testImagePath = path.join(__dirname, 'public', 'freedive log', '110m pb phillipines 060719.JPG');
    
    if (!fs.existsSync(testImagePath)) {
      throw new Error(`Test image not found: ${testImagePath}`);
    }
    
    // Use a proper UUID format for testing
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';
    
    // Step 1: Upload image and create dive log
    console.log('\n🚀 STEP 1: Creating dive log with image...');
    
    const formData = new FormData();
    const imageBuffer = fs.readFileSync(testImagePath);
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('image', imageBlob, '110m_PB.jpg');
    formData.append('userId', testUserId);
    
    const uploadResponse = await fetch(`${baseUrl}/api/dive/upload-image`, {
      method: 'POST',
      body: formData,
      headers: {
        'x-user-id': testUserId
      }
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Image upload failed: ${uploadResponse.status}`);
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('✅ Image uploaded successfully');
    console.log('📊 Extracted metrics:', uploadResult.data?.extractedMetrics);
    
    // Step 2: Save dive log with image data
    console.log('\n🚀 STEP 2: Saving dive log with image data...');
    
    const diveLogData = {
      date: new Date().toISOString().split('T')[0],
      discipline: 'CWT',
      location: 'Hanauma Bay',
      targetDepth: 110,
      reachedDepth: uploadResult.data?.extractedMetrics?.max_depth || 108,
      totalDiveTime: '3:12',
      squeeze: false,
      surfaceProtocol: 'Clean exit',
      notes: 'Testing image persistence fix',
      // Include image data from upload
      imageId: uploadResult.data?.imageId,
      imageUrl: uploadResult.data?.imageUrl,
      extractedMetrics: uploadResult.data?.extractedMetrics,
      imageAnalysis: uploadResult.data?.profileAnalysis,
      user_id: testUserId
    };
    
    const saveResponse = await fetch(`${baseUrl}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId
      },
      body: JSON.stringify(diveLogData)
    });
    
    if (!saveResponse.ok) {
      throw new Error(`Save failed: ${saveResponse.status}`);
    }
    
    const saveResult = await saveResponse.json();
    const savedDiveLogId = saveResult.data?.id;
    console.log('✅ Dive log saved with ID:', savedDiveLogId);
    
    // Step 3: Load dive logs and check if image is preserved
    console.log('\n🚀 STEP 3: Loading saved dive logs to verify image persistence...');
    
    const loadResponse = await fetch(`${baseUrl}/api/supabase/get-dive-logs`, {
      method: 'GET',
      headers: {
        'x-user-id': testUserId
      }
    });
    
    if (!loadResponse.ok) {
      throw new Error(`Load failed: ${loadResponse.status}`);
    }
    
    const loadResult = await loadResponse.json();
    const savedLog = loadResult.data?.find(log => log.id === savedDiveLogId);
    
    if (!savedLog) {
      throw new Error('Saved dive log not found in loaded data');
    }
    
    console.log('✅ Dive log loaded successfully');
    
    // Step 4: Check image persistence
    console.log('\n🔍 STEP 4: Checking image data persistence...');
    
    const hasImageUrl = !!(savedLog.imageUrl || savedLog.image_url || savedLog.ai_analysis?.imageUrl);
    const hasImageId = !!(savedLog.imageId || savedLog.ai_analysis?.imageId);
    const hasExtractedMetrics = !!(savedLog.extractedMetrics || savedLog.ai_analysis?.extractedMetrics);
    
    console.log('📊 Image Persistence Check:');
    console.log('  - Image URL preserved:', hasImageUrl ? '✅' : '❌');
    console.log('  - Image ID preserved:', hasImageId ? '✅' : '❌');
    console.log('  - Extracted metrics preserved:', hasExtractedMetrics ? '✅' : '❌');
    
    if (hasImageUrl) {
      const imageUrl = savedLog.imageUrl || savedLog.image_url || savedLog.ai_analysis?.imageUrl;
      console.log('  - Image URL:', imageUrl);
    }
    
    if (hasExtractedMetrics) {
      const metrics = savedLog.extractedMetrics || savedLog.ai_analysis?.extractedMetrics;
      console.log('  - Max depth from image:', metrics?.max_depth);
      console.log('  - Dive time from image:', metrics?.dive_time_formatted);
    }
    
    // Step 5: Test edit mode field mapping
    console.log('\n🚀 STEP 5: Testing edit mode field mapping...');
    
    // This simulates what DiveJournalDisplay does when loading a log for editing
    const editModeData = {
      imagePreview: savedLog.imageUrl || savedLog.image_url || savedLog.ai_analysis?.imageUrl || null,
      diveComputerFileName: savedLog.ai_analysis?.diveComputerFileName || "",
      // Other mapped fields
      reachedDepth: savedLog.reached_depth || 0,
      mouthfillDepth: savedLog.mouthfill_depth || 0,
    };
    
    console.log('📝 Edit Mode Data Mapping:');
    console.log('  - Image preview available:', !!editModeData.imagePreview ? '✅' : '❌');
    console.log('  - Image preview URL:', editModeData.imagePreview);
    console.log('  - Reached depth mapped:', editModeData.reachedDepth);
    console.log('  - Mouthfill depth mapped:', editModeData.mouthfillDepth);
    
    // Summary
    console.log('\n📋 TEST SUMMARY:');
    const allPassed = hasImageUrl && hasImageId && hasExtractedMetrics && editModeData.imagePreview;
    
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED! Image persistence is working correctly.');
      console.log('✅ Images are now properly saved and loaded when editing dive logs.');
    } else {
      console.log('❌ SOME TESTS FAILED. Image persistence needs further fixes.');
    }
    
    return allPassed;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testDiveLogImagePersistence().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testDiveLogImagePersistence };
