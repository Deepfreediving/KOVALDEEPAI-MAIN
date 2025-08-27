// Test live image upload functionality with proper multipart form
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testLiveImageUpload() {
  console.log('🧪 TESTING LIVE IMAGE UPLOAD FUNCTIONALITY');
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
    // Create proper multipart form data
    const form = new FormData();
    form.append('image', fs.createReadStream(testImagePath), {
      filename: imageFiles[0],
      contentType: 'image/jpeg'
    });
    form.append('userId', ADMIN_USER_ID);
    
    console.log('📤 Uploading image to production API...');
    
    const response = await fetch(`${PRODUCTION_URL}/api/openai/upload-dive-image-simple`, {
      method: 'POST',
      headers: {
        'X-User-ID': ADMIN_USER_ID,
        ...form.getHeaders()
      },
      body: form
    });
    
    console.log(`📥 Upload response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Image upload successful!');
      console.log('📊 Analysis results:');
      console.log(`   🤖 AI Analysis: ${result.extractedText?.substring(0, 200)}...`);
      console.log(`   📏 Max Depth: ${result.metrics?.max_depth || 'Not detected'}m`);
      console.log(`   ⏱️  Dive Time: ${result.metrics?.dive_time_seconds || 'Not detected'}s`);
      console.log(`   🌡️  Temperature: ${result.metrics?.temperature || 'Not detected'}°`);
      console.log(`   🔗 Storage URL: ${result.imageUrl ? 'Generated' : 'Not generated'}`);
      
      // Test E.N.C.L.O.S.E. audit with a real dive log
      console.log('\\n🔍 Testing E.N.C.L.O.S.E. audit with existing dive log...');
      
      // First get a real dive log ID
      const logsResponse = await fetch(`${PRODUCTION_URL}/api/supabase/dive-logs?userId=${ADMIN_USER_ID}`);
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        const diveLogs = logsData.diveLogs || [];
        
        if (diveLogs.length > 0) {
          const logId = diveLogs[0].id;
          console.log(`📋 Using dive log ID: ${logId}`);
          
          const auditResponse = await fetch(`${PRODUCTION_URL}/api/audit/dive-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': ADMIN_USER_ID
            },
            body: JSON.stringify({
              logId: logId,
              userId: ADMIN_USER_ID
            })
          });
          
          console.log(`🔍 Audit response status: ${auditResponse.status}`);
          
          if (auditResponse.ok) {
            const auditResult = await auditResponse.json();
            console.log('✅ E.N.C.L.O.S.E. audit successful!');
            console.log(`📊 Safety Score: ${auditResult.audit?.overallScore || 'N/A'}/100`);
            console.log(`⚠️  Recommendations: ${auditResult.audit?.recommendations?.length || 0} items`);
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
      console.log(`❌ Image upload failed: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\\n🏁 Live image upload test completed!');
}

testLiveImageUpload().catch(console.error);
