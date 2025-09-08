#!/usr/bin/env node

// Test with correct enum values from the database
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const USER_ID = '35b522f1-27d2-49de-ed2b-0d257d33ad7d';

// Test with CORRECT enum values
const correctTestData = {
  id: `correct-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  user_id: USER_ID,
  date: new Date().toISOString().split('T')[0],
  disciplineType: "depth",
  discipline: "CWT", // ✅ Valid
  location: "Blue Hole, Dahab",
  targetDepth: "105",
  reachedDepth: "103",
  mouthfillDepth: "25",
  issueDepth: "",
  issueComment: "",
  squeeze: false,
  exit: "clean", // ✅ Valid (maps to exit_protocol)
  durationOrDistance: "",
  totalDiveTime: "3:45",
  attemptType: "", // ✅ NULL is valid
  surfaceProtocol: "", // ✅ NULL is valid (not "Good")
  notes: "Testing with correct enum values",
  bottomTime: "5",
  earSqueeze: false,
  lungSqueeze: false,
  narcosisLevel: "2",
  recoveryQuality: "9",
  gear: {
    wetsuit: "3mm Orca",
    fins: "Alchemy PRO",
    mask: "Omer Alien",
    weights_kg: "2",
    nose_clip: false,
    lanyard: true,
    computer: "ORCA"
  }
};

async function testCorrectEnums() {
  console.log('🧪 Testing with CORRECT Enum Values');
  console.log('=' .repeat(50));
  
  console.log('📝 Using correct values:');
  console.log('  discipline:', correctTestData.discipline);
  console.log('  exit (exit_protocol):', correctTestData.exit);
  console.log('  surfaceProtocol:', correctTestData.surfaceProtocol || 'NULL');
  console.log('  attemptType:', correctTestData.attemptType || 'NULL');
  
  try {
    const response = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(correctTestData)
    });
    
    const result = await response.text();
    console.log('\n📥 Response status:', response.status);
    
    if (response.ok) {
      console.log('✅ SUCCESS! Dive log saved with correct enum values');
      const savedData = JSON.parse(result);
      console.log('🆔 Saved log ID:', savedData.data?.id || savedData.diveLog?.id);
      
      // Now test image upload with this working log
      console.log('\n📸 Testing image upload with valid dive log...');
      
      // Basic test - just check if the image upload endpoint works
      const imageTestData = {
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        userId: USER_ID,
        filename: 'test-image.png',
        diveLogId: savedData.data?.id || savedData.diveLog?.id || correctTestData.id
      };
      
      const imageResponse = await fetch(`${BASE_URL}/api/dive/upload-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(imageTestData)
      });
      
      const imageResult = await imageResponse.text();
      console.log('📸 Image upload status:', imageResponse.status);
      
      if (imageResponse.ok) {
        console.log('✅ Image upload also works!');
        console.log('🎉 COMPLETE WORKFLOW SUCCESSFUL!');
      } else {
        console.log('❌ Image upload failed:', imageResult.substring(0, 200));
      }
      
    } else {
      console.log('❌ STILL FAILED:', result);
      
      try {
        const errorData = JSON.parse(result);
        console.log('🔍 Error details:', errorData);
      } catch (e) {
        console.log('🔍 Raw error:', result);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCorrectEnums();
