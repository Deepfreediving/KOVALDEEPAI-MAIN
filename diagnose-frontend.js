// Frontend Diagnostic - Check what's not working
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const testUserId = '123e4567-e89b-12d3-a456-426614174000';

async function diagnoseFrontendIssues() {
  console.log('🔍 Diagnosing Frontend Issues...');
  console.log('===================================');
  
  // 1. Check if data exists
  console.log('\n1. 📊 Checking Database Data...');
  try {
    const { data: logs, error } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', testUserId);
      
    if (error) {
      console.log('❌ Database Error:', error.message);
    } else {
      console.log(`✅ Found ${logs.length} dive logs in database`);
      if (logs.length > 0) {
        console.log('Sample log:', {
          date: logs[0].date,
          depth: logs[0].reached_depth,
          discipline: logs[0].discipline
        });
      }
    }
  } catch (error) {
    console.log('❌ Database connection error:', error.message);
  }
  
  // 2. Test API endpoints
  console.log('\n2. 🌐 Testing API Endpoints...');
  
  try {
    // Test local batch logs
    const response = await fetch(`http://localhost:3000/api/dive/batch-logs?userId=${testUserId}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Local API: ${data.diveLogs?.length || 0} logs returned`);
    } else {
      console.log(`❌ Local API error: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Local API connection error:', error.message);
  }
  
  try {
    // Test production batch logs
    const prodResponse = await fetch(`https://kovaldeepai-main.vercel.app/api/dive/batch-logs?userId=${testUserId}`);
    if (prodResponse.ok) {
      const prodData = await prodResponse.json();
      console.log(`✅ Production API: ${prodData.diveLogs?.length || 0} logs returned`);
    } else {
      console.log(`❌ Production API error: ${prodResponse.status}`);
    }
  } catch (error) {
    console.log('❌ Production API connection error:', error.message);
  }
  
  // 3. Test batch analysis
  console.log('\n3. 🧠 Testing Batch Analysis...');
  
  try {
    const analysisResponse = await fetch('http://localhost:3000/api/dive/batch-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        analysisType: 'pattern',
        timeRange: 'all'
      })
    });
    
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      console.log(`✅ Batch analysis: ${analysisData.analysis?.logsAnalyzed || 0} logs analyzed`);
    } else {
      const error = await analysisResponse.json();
      console.log(`❌ Batch analysis error: ${error.error}`);
    }
  } catch (error) {
    console.log('❌ Batch analysis connection error:', error.message);
  }
  
  // 4. Check user authentication
  console.log('\n4. 🔐 Checking User Authentication...');
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single();
      
    if (error) {
      console.log('❌ User lookup error:', error.message);
    } else {
      console.log('✅ Test user exists:', user.email);
    }
  } catch (error) {
    console.log('❌ User auth error:', error.message);
  }
  
  console.log('\n📋 Diagnosis Complete!');
  console.log('\nCommon Issues to Check:');
  console.log('• Frontend not showing dive logs → Check if user ID is being passed correctly');
  console.log('• Batch analysis not working → Check if sufficient logs exist (need 1+)');
  console.log('• UI not responding → Check browser console for JavaScript errors');
  console.log('• Data not loading → Check if authentication state is working');
  console.log('\n🔧 Next Steps:');
  console.log('1. Open browser DevTools (F12) and check Console tab for errors');
  console.log('2. Navigate to Dive Journal and see which specific feature fails');
  console.log('3. Report the exact error message or behavior you see');
}

diagnoseFrontendIssues();
