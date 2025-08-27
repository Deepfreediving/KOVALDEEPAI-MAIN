// Test the new base64 image upload API
const fs = require('fs');
const path = require('path');

async function testBase64ImageUpload() {
  console.log('🧪 TESTING BASE64 IMAGE UPLOAD API');
  console.log('==========================================');
  
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
  
  const PRODUCTION_URL = 'https://kovaldeepai-main.vercel.app';
  const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  
  // Find a test dive image
  const diveLogsDir = path.join(__dirname, 'public', 'freedive log');
  if (!fs.existsSync(diveLogsDir)) {
    console.error('❌ Dive logs directory not found');
    return;
  }
  
  const imageFiles = fs.readdirSync(diveLogsDir)
    .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
    .slice(0, 1); // Just test with one image
  
  if (imageFiles.length === 0) {
    console.error('❌ No image files found in dive logs directory');
    return;
  }
  
  const testImagePath = path.join(diveLogsDir, imageFiles[0]);
  const testImageStats = fs.statSync(testImagePath);
  
  console.log(`📸 Testing with: ${imageFiles[0]} (${Math.round(testImageStats.size / 1024)}KB)`);
  
  try {
    // Read image and convert to base64
    const imageBuffer = fs.readFileSync(testImagePath);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    
    console.log(`📊 Base64 size: ${Math.round(base64Image.length / 1024)}KB`);
    console.log('📤 Uploading to base64 API...');
    
    const response = await fetch(`${PRODUCTION_URL}/api/openai/upload-dive-image-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': ADMIN_USER_ID
      },
      body: JSON.stringify({
        imageData: base64Image,
        userId: ADMIN_USER_ID,
        filename: imageFiles[0]
      })
    });
    
    console.log(`📥 Upload response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Base64 image upload successful!');
      console.log('📊 Analysis results:');
      console.log(`   🤖 AI Analysis: ${result.extractedText?.substring(0, 200)}...`);
      console.log(`   📏 Max Depth: ${result.metrics?.max_depth || 'Not detected'}m`);
      console.log(`   ⏱️  Dive Time: ${result.metrics?.dive_time_seconds || 'Not detected'}s`);
      console.log(`   🌡️  Temperature: ${result.metrics?.temperature || 'Not detected'}°`);
      console.log(`   🔗 Storage URL: ${result.imageUrl ? 'Generated ✅' : 'Not generated ❌'}`);
      console.log(`   🆔 Image ID: ${result.imageId || 'Not saved'}`);
      
      // Now test the E.N.C.L.O.S.E. audit with existing logs
      console.log('\\n🔍 Testing E.N.C.L.O.S.E. audit system...');
      
      // Get existing dive logs
      const logsResponse = await fetch(`${PRODUCTION_URL}/api/supabase/dive-logs?userId=${ADMIN_USER_ID}`);
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        const diveLogs = logsData.diveLogs || [];
        
        if (diveLogs.length > 0) {
          const logId = diveLogs[0].id;
          console.log(`📋 Testing audit with dive log: ${diveLogs[0].date} - ${diveLogs[0].discipline} (${diveLogs[0].reached_depth}m)`);
          
          const auditResponse = await fetch(`${PRODUCTION_URL}/api/audit/dive-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': ADMIN_USER_ID
            },
            body: JSON.stringify({
              logId: logId,
              userId: ADMIN_USER_ID,
              consentGiven: true
            })
          });
          
          console.log(`🔍 Audit response status: ${auditResponse.status}`);
          
          if (auditResponse.ok) {
            const auditResult = await auditResponse.json();
            console.log('✅ E.N.C.L.O.S.E. audit successful!');
            console.log(`📊 Overall Safety Score: ${auditResult.audit?.overallScore || 'N/A'}/100`);
            console.log(`📋 Assessment Categories:`);
            if (auditResult.audit?.assessment) {
              Object.entries(auditResult.audit.assessment).forEach(([key, value]) => {
                console.log(`   ${key}: ${value.score}/10 - ${value.status}`);
              });
            }
            console.log(`⚠️  Recommendations: ${auditResult.audit?.recommendations?.length || 0} items`);
            if (auditResult.audit?.recommendations?.length > 0) {
              auditResult.audit.recommendations.slice(0, 3).forEach((rec, i) => {
                console.log(`   ${i+1}. ${rec.title}: ${rec.description?.substring(0, 100)}...`);
              });
            }
          } else {
            const auditError = await auditResponse.text();
            console.log(`❌ E.N.C.L.O.S.E. audit failed: ${auditError}`);
          }
        } else {
          console.log('❌ No dive logs found for audit testing');
        }
      } else {
        console.log('❌ Failed to fetch dive logs for audit testing');
      }
      
    } else {
      const errorText = await response.text();
      console.log(`❌ Base64 image upload failed: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\\n🏁 Base64 image upload test completed!');
}

testBase64ImageUpload().catch(console.error);
