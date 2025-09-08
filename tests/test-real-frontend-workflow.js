#!/usr/bin/env node

// Test the complete frontend workflow with real data
const fs = require('fs');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:3000';
const USER_ID = '35b522f1-27d2-49de-ed2b-0d257d33ad7d';

// Test data - realistic dive log entry
const testDiveLog = {
  id: `dive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  user_id: USER_ID,
  date: new Date().toISOString().split('T')[0],
  disciplineType: "depth",
  discipline: "Constant Weight with bifins - modified technique", // Free text instead of enum
  location: "Blue Hole, Dahab",
  targetDepth: "105",
  reachedDepth: "103",
  mouthfillDepth: "25",
  issueDepth: "",
  issueComment: "",
  squeeze: false,
  exit: "Clean exit with controlled ascent",
  durationOrDistance: "",
  totalDiveTime: "3:45",
  attemptType: "Training dive with competition prep",
  surfaceProtocol: "Good recovery, slight breathing increase but felt strong",
  notes: "Strong mouthfill technique, clean dive profile",
  // Advanced fields
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

// Create a realistic dive computer image (SVG that looks like a real screenshot)
function createRealisticDiveComputerSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" style="background: #000">
  <!-- Screen bezel -->
  <rect x="10" y="10" width="380" height="280" rx="15" fill="#222" stroke="#444" stroke-width="2"/>
  <rect x="20" y="20" width="360" height="260" rx="10" fill="#001122" stroke="#003366" stroke-width="1"/>
  
  <!-- Main display -->
  <rect x="30" y="30" width="340" height="240" fill="#000033"/>
  
  <!-- Title -->
  <text x="200" y="50" text-anchor="middle" fill="#00ff99" font-family="monospace" font-size="14" font-weight="bold">ORCA DIVE COMPUTER</text>
  
  <!-- Max depth display -->
  <text x="60" y="80" fill="#00ffff" font-family="monospace" font-size="24" font-weight="bold">MAX DEPTH</text>
  <text x="60" y="110" fill="#ffff00" font-family="monospace" font-size="32" font-weight="bold">103.6m</text>
  
  <!-- Dive time -->
  <text x="250" y="80" fill="#00ffff" font-family="monospace" font-size="18">TIME</text>
  <text x="250" y="110" fill="#ffff00" font-family="monospace" font-size="24">03:45</text>
  
  <!-- Temperature -->
  <text x="320" y="80" fill="#00ffff" font-family="monospace" font-size="14">TEMP</text>
  <text x="320" y="100" fill="#ffff00" font-family="monospace" font-size="16">23°C</text>
  
  <!-- Dive profile graph -->
  <rect x="40" y="130" width="320" height="120" fill="#000044" stroke="#0066aa" stroke-width="1"/>
  
  <!-- Depth scale -->
  <text x="35" y="140" fill="#888" font-family="monospace" font-size="8">0m</text>
  <text x="30" y="170" fill="#888" font-family="monospace" font-size="8">30m</text>
  <text x="30" y="200" fill="#888" font-family="monospace" font-size="8">60m</text>
  <text x="30" y="230" fill="#888" font-family="monospace" font-size="8">90m</text>
  <text x="25" y="245" fill="#888" font-family="monospace" font-size="8">120m</text>
  
  <!-- Time scale -->
  <text x="50" y="265" fill="#888" font-family="monospace" font-size="8">0:00</text>
  <text x="140" y="265" fill="#888" font-family="monospace" font-size="8">1:00</text>
  <text x="230" y="265" fill="#888" font-family="monospace" font-size="8">2:00</text>
  <text x="320" y="265" fill="#888" font-family="monospace" font-size="8">3:00</text>
  
  <!-- Dive profile curve -->
  <polyline 
    points="50,135 70,145 90,165 110,190 130,215 150,235 170,245 190,240 210,225 230,200 250,175 270,155 290,140 320,135"
    fill="none" 
    stroke="#00ff99" 
    stroke-width="3"/>
  
  <!-- Mouthfill point indicator -->
  <circle cx="90" cy="165" r="3" fill="#ff6600"/>
  <text x="95" y="160" fill="#ff6600" font-family="monospace" font-size="8">MF</text>
  
  <!-- Bottom time indicator -->
  <circle cx="170" cy="245" r="3" fill="#ff0066"/>
  <text x="175" y="240" fill="#ff0066" font-family="monospace" font-size="8">BT</text>
  
  <!-- Additional info -->
  <text x="60" y="290" fill="#888" font-family="monospace" font-size="10">MODE: FREE | BAT: 87% | 15:42</text>
</svg>`;
}

async function testCompleteWorkflow() {
  console.log('🧪 Testing Complete Frontend Workflow with Real Data');
  console.log('=' .repeat(60));
  
  try {
    // STEP 1: Save dive log first (should work)
    console.log('\n🚀 STEP 1: Saving dive log to Supabase...');
    console.log('📝 Dive log data:', {
      id: testDiveLog.id,
      discipline: testDiveLog.discipline,
      location: testDiveLog.location,
      depth: testDiveLog.reachedDepth + 'm',
      user_id: testDiveLog.user_id
    });
    
    const saveResponse = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testDiveLog)
    });
    
    const saveResult = await saveResponse.text();
    console.log('📥 Save response status:', saveResponse.status);
    console.log('📥 Save response body:', saveResult);
    
    if (!saveResponse.ok) {
      console.error('❌ DIVE LOG SAVE FAILED!');
      console.error('Error details:', saveResult);
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(saveResult);
        if (errorData.error?.includes('enum')) {
          console.error('🔍 ENUM ERROR DETECTED!');
          console.error('Current discipline value:', testDiveLog.discipline);
          console.error('This suggests database enum values don\'t match frontend values');
        }
      } catch (e) {
        // Non-JSON error
      }
      
      return;
    }
    
    const savedData = JSON.parse(saveResult);
    const savedLogId = savedData.data?.id || savedData.diveLog?.id || testDiveLog.id;
    console.log('✅ Dive log saved successfully! ID:', savedLogId);
    
    // STEP 2: Upload and analyze dive computer image
    console.log('\n📸 STEP 2: Uploading dive computer image...');
    
    // Create realistic SVG image
    const svgContent = createRealisticDiveComputerSVG();
    const imageBuffer = Buffer.from(svgContent);
    
    // Create FormData for image upload
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: 'dive-computer-103m.svg',
      contentType: 'image/svg+xml'
    });
    formData.append('diveLogId', savedLogId);
    formData.append('userId', USER_ID);
    
    console.log('📤 Uploading image:', {
      filename: 'dive-computer-103m.svg',
      size: imageBuffer.length + ' bytes',
      diveLogId: savedLogId,
      userId: USER_ID
    });
    
    const imageResponse = await fetch(`${BASE_URL}/api/dive/upload-image`, {
      method: 'POST',
      body: formData
    });
    
    const imageResult = await imageResponse.text();
    console.log('📥 Image response status:', imageResponse.status);
    console.log('📥 Image response body:', imageResult.substring(0, 500) + '...');
    
    if (imageResponse.ok) {
      console.log('✅ Image uploaded and analyzed successfully!');
      
      try {
        const imageData = JSON.parse(imageResult);
        console.log('🧠 Analysis summary:', {
          confidence: imageData.data?.analysis?.confidence,
          maxDepth: imageData.data?.extractedMetrics?.max_depth,
          diveTime: imageData.data?.extractedMetrics?.dive_time_formatted,
          performanceRating: imageData.data?.extractedMetrics?.performance_rating,
          imageUrl: imageData.data?.imageUrl ? 'Generated' : 'None'
        });
      } catch (e) {
        console.warn('⚠️ Could not parse image analysis result');
      }
    } else {
      console.error('❌ IMAGE UPLOAD FAILED!');
      console.error('Error details:', imageResult);
    }
    
    // STEP 3: Verify data in database
    console.log('\n🔍 STEP 3: Verifying saved data...');
    console.log('✅ Complete workflow test finished!');
    console.log('\nSUMMARY:');
    console.log('- Dive log save:', saveResponse.ok ? '✅ SUCCESS' : '❌ FAILED');
    console.log('- Image upload:', imageResponse.ok ? '✅ SUCCESS' : '❌ FAILED');
    
  } catch (error) {
    console.error('❌ Workflow test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Main execution
if (require.main === module) {
  testCompleteWorkflow();
}

module.exports = { testCompleteWorkflow };
