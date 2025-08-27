// Final comprehensive test with proper user authentication simulation
const fs = require('fs');
const path = require('path');

// Load environment variables
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const BASE_URL = 'https://kovaldeepai-main.vercel.app';

async function testWithUserAuth() {
  console.log('🔧 COMPREHENSIVE SYSTEM TEST WITH USER AUTHENTICATION');
  console.log('==========================================\n');

  // Test 1: Test dive log submission with real dive computer image
  console.log('1️⃣ Testing Dive Log Submission with Real Image...');
  try {
    const diveLogsPath = path.join(__dirname, 'public', 'freedive log');
    const images = fs.readdirSync(diveLogsPath).filter(f => 
      f.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/i)
    );
    
    if (images.length === 0) {
      console.log('⚠️ No images found in freedive log folder');
      return;
    }

    // Pick a random dive computer image
    const testImage = images[Math.floor(Math.random() * images.length)];
    const imagePath = path.join(diveLogsPath, testImage);
    const imageBuffer = fs.readFileSync(imagePath);
    
    console.log(`📸 Using test image: ${testImage} (${Math.round(imageBuffer.length/1024)}KB)`);

    // Create FormData for image upload
    const FormData = require('form-data');
    const form = new FormData();
    form.append('image', imageBuffer, {
      filename: testImage,
      contentType: `image/${path.extname(testImage).slice(1)}`
    });
    form.append('userId', ADMIN_USER_ID);
    form.append('userIdentifier', ADMIN_USER_ID);

    // Test image upload and analysis
    const uploadResponse = await fetch(`${BASE_URL}/api/openai/upload-dive-image-simple`, {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'Test-Script/1.0',
        'x-user-id': ADMIN_USER_ID
      }
    });

    console.log(`📤 Upload response: ${uploadResponse.status}`);
    
    if (uploadResponse.ok) {
      const uploadResult = await uploadResponse.json();
      console.log('✅ Image upload successful!');
      console.log(`🤖 Extracted text preview: ${uploadResult.extractedText?.substring(0, 100)}...`);
      console.log(`🗄️ Supabase URL: ${uploadResult.supabaseUrl}`);
      
      // Now test saving a dive log with this image data
      const diveLogData = {
        date: new Date().toISOString().split('T')[0],
        discipline: 'CWT',
        location: 'Test Location - Blue Hole',
        targetDepth: '100',
        reachedDepth: '98',
        totalDiveTime: '3:45',
        notes: `Test dive log with real image analysis from ${testImage}`,
        imageUrl: uploadResult.supabaseUrl,
        imageAnalysis: uploadResult.extractedText,
        userId: ADMIN_USER_ID
      };

      const saveResponse = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Test-Script/1.0'
        },
        body: JSON.stringify(diveLogData)
      });

      console.log(`💾 Save response: ${saveResponse.status}`);
      
      if (saveResponse.ok) {
        const saveResult = await saveResponse.json();
        console.log('✅ Dive log saved successfully!');
        console.log(`📝 Log ID: ${saveResult.id}`);
      } else {
        const errorText = await saveResponse.text();
        console.log('❌ Failed to save dive log:', errorText);
      }
      
    } else {
      const errorText = await uploadResponse.text();
      console.log('❌ Image upload failed:', errorText);
    }

  } catch (error) {
    console.error('❌ Dive log submission test failed:', error.message);
  }

  // Test 2: Test dive logs retrieval
  console.log('\n2️⃣ Testing Dive Logs Retrieval...');
  try {
    const response = await fetch(`${BASE_URL}/api/supabase/dive-logs?userId=${ADMIN_USER_ID}`, {
      headers: { 'User-Agent': 'Test-Script/1.0' }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Retrieved ${data.diveLogs?.length || 0} dive logs`);
      
      if (data.diveLogs && data.diveLogs.length > 0) {
        console.log('📊 Recent dive logs:');
        data.diveLogs.slice(0, 3).forEach((log, i) => {
          console.log(`   ${i+1}. ${log.date} - ${log.discipline} at ${log.location} (${log.reached_depth}m)`);
        });
      }
    } else {
      console.log('❌ Failed to retrieve dive logs:', response.status);
    }
  } catch (error) {
    console.error('❌ Dive logs retrieval test failed:', error.message);
  }

  // Test 3: Test E.N.C.L.O.S.E. Audit System
  console.log('\n3️⃣ Testing E.N.C.L.O.S.E. Audit System...');
  try {
    const auditData = {
      userId: ADMIN_USER_ID,
      logId: ADMIN_USER_ID, // Use valid UUID format
      diveLogData: {
        id: 'test-audit-log',
        date: new Date().toISOString().split('T')[0],
        discipline: 'CWT',
        location: 'Blue Hole, Bahamas',
        targetDepth: 100,
        reachedDepth: 95,
        totalDiveTime: '3:30',
        notes: 'Test dive for E.N.C.L.O.S.E. audit system',
        squeeze: false,
        exit: 'good',
        surfaceProtocol: 'OK'
      }
    };

    const auditResponse = await fetch(`${BASE_URL}/api/audit/dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script/1.0'
      },
      body: JSON.stringify(auditData)
    });

    console.log(`🔍 Audit response: ${auditResponse.status}`);
    
    if (auditResponse.ok) {
      const auditResult = await auditResponse.json();
      console.log('✅ E.N.C.L.O.S.E. audit completed!');
      console.log(`📊 Overall score: ${auditResult.overallScore}/100`);
      console.log(`💡 Key recommendations: ${auditResult.analysis?.key_recommendations?.slice(0, 2).join(', ')}`);
    } else {
      const errorText = await auditResponse.text();
      console.log('❌ E.N.C.L.O.S.E. audit failed:', errorText);
    }
  } catch (error) {
    console.error('❌ E.N.C.L.O.S.E. audit test failed:', error.message);
  }

  // Test 4: Test Chat API with dive context
  console.log('\n4️⃣ Testing Chat API with Dive Context...');
  try {
    const chatData = {
      message: 'What should I focus on for my next training session based on my recent 95m CWT dive?',
      userId: ADMIN_USER_ID,
      userProfile: {
        firstName: 'Daniel',
        lastName: 'Koval',
        nickname: 'Daniel Koval',
        email: 'daniel@deepfreediving.com',
        isInstructor: true
      },
      diveLogs: [
        {
          date: new Date().toISOString().split('T')[0],
          discipline: 'CWT',
          location: 'Training Pool',
          targetDepth: 100,
          reachedDepth: 95,
          totalDiveTime: '3:30'
        }
      ]
    };

    const chatResponse = await fetch(`${BASE_URL}/api/openai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script/1.0'
      },
      body: JSON.stringify(chatData)
    });

    console.log(`💬 Chat response: ${chatResponse.status}`);
    
    if (chatResponse.ok) {
      const chatResult = await chatResponse.json();
      console.log('✅ Chat API working!');
      console.log(`🤖 AI Response preview: ${chatResult.message?.content?.substring(0, 150) || chatResult.content?.substring(0, 150) || 'Response received'}...`);
    } else {
      const errorText = await chatResponse.text();
      console.log('❌ Chat API failed:', errorText);
    }
  } catch (error) {
    console.error('❌ Chat API test failed:', error.message);
  }

  console.log('\n🏁 COMPREHENSIVE TESTING COMPLETED!');
  console.log('==========================================');
  console.log('\n📋 SUMMARY:');
  console.log('• Dive log submission with real image analysis');
  console.log('• Dive logs database retrieval'); 
  console.log('• E.N.C.L.O.S.E. audit system');
  console.log('• AI chat with dive context');
  console.log('\n✨ All systems tested with proper user authentication simulation!');
}

testWithUserAuth().catch(console.error);
