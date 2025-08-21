// Test script to submit a complete dive log with ALL coaching-critical fields
const fs = require('fs');

async function testCompleteCoachingData() {
  console.log('🏊 TESTING COMPLETE COACHING DATA SUBMISSION');
  console.log('============================================');
  
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
  
  // Create a comprehensive dive log with ALL coaching-critical fields
  const completeDiveLog = {
    // Basic information
    date: '2025-08-21',
    discipline: 'CWT Monofin',
    location: 'Dean\'s Blue Hole - Competition Training',
    
    // Depth measurements - CRITICAL FOR COACHING
    targetDepth: '115',
    reachedDepth: '113',
    mouthfillDepth: '85', // ⚠️ ESSENTIAL - Where mouthfill runs out
    issueDepth: '95', // ⚠️ CRITICAL - Where problems started
    
    // Time measurements
    totalDiveTime: '3:45',
    bottomTime: '8',
    
    // Safety indicators - ESSENTIAL FOR COACHING
    squeeze: true, // ⚠️ Had squeeze issues
    earSqueeze: false,
    lungSqueeze: true, // ⚠️ Lung squeeze detected
    issueComment: 'Felt lung squeeze starting at 95m, had to slow descent. Mouthfill ran out at 85m as planned but squeeze made it uncomfortable. Need to work on equalization technique.', // ⚠️ DETAILED ANALYSIS
    
    // Performance data
    exit: 'Clean but slow', // Clean/messy exit analysis
    attemptType: 'Competition Training', // Training type
    surfaceProtocol: 'Full recovery in 45 seconds, no LMC', // Recovery analysis
    narcosisLevel: 'Mild at depth, manageable', // Mental state
    recoveryQuality: 'Good - no residual effects', // Post-dive assessment
    
    // Comprehensive coaching notes
    notes: `Competition training dive to 113m. Key observations:
    - Descent rate good until 95m
    - Lung squeeze started earlier than expected (95m vs usual 100m+)
    - Mouthfill technique solid, lasted to planned 85m
    - Turn smooth despite depth issues
    - Ascent controlled, no rush despite discomfort
    - Mental state remained calm throughout
    - Need to focus on lung preparation for deeper attempts
    - Consider adjusting mouthfill depth for safety margin
    - Overall technique improving, just need physiological adaptation`,
    
    // Additional metadata
    disciplineType: 'depth',
    durationOrDistance: '113m depth',
    gear: {
      wetsuit: '3mm Orca',
      fins: 'C4 Falcon 30',
      mask: 'Omer Alien',
      weights_kg: '2',
      nose_clip: true,
      lanyard: true,
      computer: 'Suunto D5'
    }
  };
  
  console.log('📋 Submitting comprehensive dive log with ALL coaching fields...');
  console.log(`🎯 Target: ${completeDiveLog.targetDepth}m | Reached: ${completeDiveLog.reachedDepth}m`);
  console.log(`💨 Mouthfill Depth: ${completeDiveLog.mouthfillDepth}m (CRITICAL)`);
  console.log(`⚠️  Issue Depth: ${completeDiveLog.issueDepth}m (SAFETY)`);
  console.log(`🫁 Squeeze: ${completeDiveLog.squeeze ? 'YES' : 'NO'} (${completeDiveLog.lungSqueeze ? 'LUNG' : ''})`);
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': ADMIN_USER_ID
      },
      body: JSON.stringify({
        diveLogData: completeDiveLog,
        userId: ADMIN_USER_ID
      })
    });
    
    console.log(`📥 Save response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Complete coaching data saved successfully!');
      console.log(`🆔 Dive log ID: ${result.id || result.data?.id}`);
      
      // Now verify the data was saved correctly by fetching it back
      console.log('\\n🔍 VERIFYING ALL FIELDS WERE SAVED...');
      
      const verifyResponse = await fetch(`${PRODUCTION_URL}/api/supabase/dive-logs?userId=${ADMIN_USER_ID}`);
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        const diveLogs = verifyData.diveLogs || [];
        
        // Find our just-saved log (should be the most recent)
        const savedLog = diveLogs.find(log => 
          log.date === completeDiveLog.date && 
          log.reached_depth == completeDiveLog.reachedDepth
        );
        
        if (savedLog) {
          console.log('✅ Dive log found in database!');
          console.log('📊 CRITICAL COACHING FIELDS VERIFICATION:');
          console.log(`   🎯 Target Depth: ${savedLog.target_depth}m ✅`);
          console.log(`   📏 Reached Depth: ${savedLog.reached_depth}m ✅`);
          console.log(`   💨 Mouthfill Depth: ${savedLog.mouthfill_depth}m ${savedLog.mouthfill_depth ? '✅' : '❌ NULL'}`);
          console.log(`   ⚠️  Issue Depth: ${savedLog.issue_depth}m ${savedLog.issue_depth ? '✅' : '❌ NULL'}`);
          console.log(`   🫁 Squeeze: ${savedLog.squeeze} ${savedLog.squeeze !== null ? '✅' : '❌ NULL'}`);
          console.log(`   👂 Ear Squeeze: ${savedLog.ear_squeeze} ${savedLog.ear_squeeze !== null ? '✅' : '❌ NULL'}`);
          console.log(`   🫁 Lung Squeeze: ${savedLog.lung_squeeze} ${savedLog.lung_squeeze !== null ? '✅' : '❌ NULL'}`);
          console.log(`   💬 Issue Comment: ${savedLog.issue_comment ? 'Present ✅' : '❌ NULL'}`);
          console.log(`   🚪 Exit: ${savedLog.exit || '❌ NULL'}`);
          console.log(`   🏆 Attempt Type: ${savedLog.attempt_type || '❌ NULL'}`);
          console.log(`   🤿 Surface Protocol: ${savedLog.surface_protocol || '❌ NULL'}`);
          console.log(`   📝 Notes: ${savedLog.notes ? 'Present ✅' : '❌ NULL'}`);
          
          // Check for any NULL values in critical fields
          const criticalFields = [
            'mouthfill_depth', 'issue_depth', 'squeeze', 'ear_squeeze', 
            'lung_squeeze', 'issue_comment', 'exit', 'attempt_type', 'surface_protocol'
          ];
          
          const nullFields = criticalFields.filter(field => 
            savedLog[field] === null || savedLog[field] === undefined
          );
          
          if (nullFields.length === 0) {
            console.log('\\n🏆 SUCCESS: ALL CRITICAL COACHING FIELDS SAVED CORRECTLY!');
          } else {
            console.log(`\\n⚠️  WARNING: ${nullFields.length} critical fields are NULL:`);
            nullFields.forEach(field => console.log(`   - ${field}`));
          }
          
        } else {
          console.log('❌ Could not find the saved dive log for verification');
        }
      } else {
        console.log('❌ Could not verify saved data');
      }
      
    } else {
      const errorText = await response.text();
      console.log(`❌ Save failed: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\\n🏁 Complete coaching data test finished!');
}

testCompleteCoachingData().catch(console.error);
