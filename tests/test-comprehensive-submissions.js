// Comprehensive test to submit dive logs with images and verify database population
const fs = require('fs');
const path = require('path');

async function comprehensiveSubmissionTest() {
  console.log('🚀 COMPREHENSIVE DIVE LOG SUBMISSION TEST');
  console.log('========================================');
  
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
  
  // Find dive computer images to test with
  const diveLogsDir = path.join(__dirname, 'public', 'freedive log');
  const imageFiles = fs.readdirSync(diveLogsDir)
    .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
    .slice(0, 3); // Test with 3 images
  
  console.log(`📸 Found ${imageFiles.length} dive images to test with:`);
  imageFiles.forEach((file, i) => {
    console.log(`   ${i+1}. ${file.substring(0, 60)}...`);
  });
  
  const testDives = [
    {
      date: '2025-08-21',
      discipline: 'CWT',
      location: 'Test Pool - Image Analysis',
      targetDepth: 95,
      reachedDepth: 98,
      totalDiveTime: '2:58',
      notes: 'Testing image analysis integration with real dive computer data'
    },
    {
      date: '2025-08-21', 
      discipline: 'FIM',
      location: 'Test Pool - Narcosis Study',
      targetDepth: 85,
      reachedDepth: 89,
      totalDiveTime: '3:00',
      notes: 'Testing FIM dive with narcosis detection from computer image'
    },
    {
      date: '2025-08-21',
      discipline: 'CWT',
      location: 'Test Pool - Deep Training',
      targetDepth: 100,
      reachedDepth: 103,
      totalDiveTime: '3:05',
      notes: 'Testing deep training dive with contractions analysis'
    }
  ];
  
  for (let i = 0; i < Math.min(imageFiles.length, testDives.length); i++) {
    const imageFile = imageFiles[i];
    const diveData = testDives[i];
    
    console.log(`\\n📋 SUBMISSION ${i + 1}: ${diveData.discipline} dive with image analysis`);
    console.log('----------------------------------------------------------');
    
    try {
      // Step 1: Upload and analyze the dive computer image
      console.log(`📸 Step 1: Uploading dive computer image: ${imageFile.substring(0, 40)}...`);
      
      const imagePath = path.join(diveLogsDir, imageFile);
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
      
      const imageResponse = await fetch(`${PRODUCTION_URL}/api/openai/upload-dive-image-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': ADMIN_USER_ID
        },
        body: JSON.stringify({
          imageData: base64Image,
          userId: ADMIN_USER_ID,
          filename: imageFile
        })
      });
      
      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.log(`❌ Image upload failed: ${errorText}`);
        continue;
      }
      
      const imageResult = await imageResponse.json();
      console.log('✅ Image analysis completed!');
      console.log(`   🤖 Analysis: ${imageResult.extractedText?.substring(0, 150)}...`);
      console.log(`   📏 Extracted Depth: ${imageResult.metrics?.max_depth || 'Not detected'}m`);
      console.log(`   ⏱️  Extracted Time: ${imageResult.metrics?.dive_time_seconds || 'Not detected'}s`);
      console.log(`   🔗 Image URL: ${imageResult.imageUrl ? 'Generated' : 'Failed'}`);
      console.log(`   🆔 Image ID: ${imageResult.imageId || 'Not saved'}`);
      
      // Step 2: Submit the dive log with the image analysis
      console.log('\\n📝 Step 2: Submitting dive log with extracted data...');
      
      // Merge extracted data with test data
      const enhancedDiveData = {
        ...diveData,
        // Use extracted metrics if available, otherwise use test data
        reachedDepth: imageResult.metrics?.max_depth || diveData.reachedDepth,
        totalDiveTime: imageResult.metrics?.dive_time_seconds ? 
          `${Math.floor(imageResult.metrics.dive_time_seconds / 60)}:${String(imageResult.metrics.dive_time_seconds % 60).padStart(2, '0')}` : 
          diveData.totalDiveTime,
        // Add image analysis data
        notes: `${diveData.notes}\\n\\nAI Analysis: ${imageResult.extractedText?.substring(0, 200)}...`,
        imageUrl: imageResult.imageUrl,
        imageId: imageResult.imageId,
        extractedMetrics: imageResult.metrics
      };
      
      const logResponse = await fetch(`${PRODUCTION_URL}/api/supabase/save-dive-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': ADMIN_USER_ID
        },
        body: JSON.stringify({
          diveLogData: enhancedDiveData,
          userId: ADMIN_USER_ID
        })
      });
      
      if (!logResponse.ok) {
        const errorText = await logResponse.text();
        console.log(`❌ Dive log submission failed: ${errorText}`);
        continue;
      }
      
      const logResult = await logResponse.json();
      console.log('✅ Dive log saved successfully!');
      console.log(`   🆔 Log ID: ${logResult.id || 'Generated'}`);
      console.log(`   📊 Depth: ${enhancedDiveData.reachedDepth}m`);
      console.log(`   ⏱️  Time: ${enhancedDiveData.totalDiveTime}`);
      
      // Step 3: Run E.N.C.L.O.S.E. audit on the new dive log
      if (logResult.id) {
        console.log('\\n🔍 Step 3: Running E.N.C.L.O.S.E. safety audit...');
        
        const auditResponse = await fetch(`${PRODUCTION_URL}/api/audit/dive-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': ADMIN_USER_ID
          },
          body: JSON.stringify({
            logId: logResult.id,
            userId: ADMIN_USER_ID,
            consentGiven: true
          })
        });
        
        if (auditResponse.ok) {
          const auditResult = await auditResponse.json();
          console.log('✅ E.N.C.L.O.S.E. audit completed!');
          console.log(`   📊 Safety Score: ${auditResult.audit?.overallScore || 'Calculating...'}%`);
          
          if (auditResult.audit?.assessment) {
            console.log('   📋 Assessment Categories:');
            Object.entries(auditResult.audit.assessment).forEach(([category, assessment]) => {
              const emoji = assessment.score >= 8 ? '✅' : assessment.score >= 6 ? '⚠️' : '❌';
              console.log(`      ${emoji} ${category}: ${assessment.score}/10`);
            });
          }
          
          if (auditResult.audit?.recommendations?.length > 0) {
            console.log(`   💡 Recommendations: ${auditResult.audit.recommendations.length} items`);
          }
        } else {
          const auditError = await auditResponse.text();
          console.log(`❌ Audit failed: ${auditError}`);
        }
      }
      
      console.log(`\\n✅ SUBMISSION ${i + 1} COMPLETE - All data should now be in database!`);
      
      // Wait between submissions to avoid rate limiting
      if (i < Math.min(imageFiles.length, testDives.length) - 1) {
        console.log('\\n⏳ Waiting 3 seconds before next submission...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`❌ Submission ${i + 1} failed:`, error.message);
    }
  }
  
  // Step 4: Verify all data was saved correctly
  console.log('\\n📊 FINAL VERIFICATION - CHECKING ALL DATABASE TABLES');
  console.log('====================================================');
  
  try {
    // Check dive logs
    const logsResponse = await fetch(`${PRODUCTION_URL}/api/supabase/dive-logs?userId=${ADMIN_USER_ID}`);
    if (logsResponse.ok) {
      const logsData = await logsResponse.json();
      console.log(`✅ Dive Logs: ${logsData.diveLogs?.length || 0} total logs found`);
      
      // Check for recent test logs
      const testLogs = logsData.diveLogs?.filter(log => log.date === '2025-08-21' && log.location?.includes('Test Pool'));
      console.log(`   📋 Test Submissions: ${testLogs?.length || 0} new logs from this test`);
    } else {
      console.log('❌ Could not verify dive logs');
    }
    
    console.log('\\n🎯 DATABASE POPULATION VERIFICATION:');
    console.log('   • dive_logs table: Should contain new entries with image references');
    console.log('   • dive_log_image table: Should contain image metadata and analysis');
    console.log('   • dive_log_audit table: Should contain E.N.C.L.O.S.E. audit results');
    console.log('   • v_dive_metrics view: Should show extracted metrics');
    console.log('   • v_user_enclose_summary: Should show audit summaries');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
  
  console.log('\\n🏆 COMPREHENSIVE SUBMISSION TEST COMPLETED!');
  console.log('Check the Supabase dashboard to verify all tables are populated.');
}

comprehensiveSubmissionTest().catch(console.error);
