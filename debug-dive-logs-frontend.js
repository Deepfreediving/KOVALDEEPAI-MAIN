#!/usr/bin/env node

// Debug script to simulate the frontend dive logs loading logic
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'apps/web/.env.local') });

async function simulateFrontendLogic() {
  console.log('🔍 Debugging Dive Logs Frontend Logic');
  console.log('=====================================');
  
  // 1. Simulate getUserIdentifier logic
  const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  console.log('🆔 User Identifier:', ADMIN_USER_ID);
  
  // 2. Simulate localStorage key
  const storageKey = `dive_logs_${ADMIN_USER_ID}`;
  console.log('🗄️ LocalStorage Key:', storageKey);
  
  // 3. Simulate API call
  const API_ENDPOINT = '/api/supabase/dive-logs';
  console.log('🌐 API Endpoint:', API_ENDPOINT);
  console.log('🌐 Query Parameters:', `userId=${ADMIN_USER_ID}`);
  
  // 4. Test direct Supabase connection
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    console.log('\n🔧 Testing Direct Supabase Query...');
    const { data, error } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', ADMIN_USER_ID)
      .order('date', { ascending: false });
      
    if (error) {
      console.error('❌ Supabase Error:', error);
      return;
    }
    
    console.log(`✅ Found ${data.length} dive logs in Supabase`);
    
    if (data.length > 0) {
      console.log('\n📊 Sample Dive Log:');
      console.log('-------------------');
      const sample = data[0];
      console.log('ID:', sample.id);
      console.log('Date:', sample.date);
      console.log('Discipline:', sample.discipline);
      console.log('Location:', sample.location);
      console.log('Depth:', sample.reached_depth || sample.target_depth);
      console.log('Notes:', sample.notes || 'No notes');
    }
    
    // 5. Test the exact API endpoint logic
    console.log('\n🧪 Testing API Endpoint Logic...');
    const crypto = require('crypto');
    
    // Simulate the API's user ID resolution logic
    let final_user_id;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ADMIN_USER_ID);
    const adminPatterns = ['daniel_koval', 'Daniel Koval', 'daniel@deepfreediving.com', 'danielkoval@example.com'];
    
    if (isUUID) {
      final_user_id = ADMIN_USER_ID;
      console.log('✅ User ID is valid UUID:', final_user_id);
    } else if (adminPatterns.includes(ADMIN_USER_ID)) {
      final_user_id = ADMIN_USER_ID;
      console.log('✅ User ID matches admin pattern:', final_user_id);
    } else {
      // Create deterministic UUID from user identifier  
      const hash = crypto.createHash('md5').update(ADMIN_USER_ID).digest('hex');
      final_user_id = [
        hash.substr(0, 8),
        hash.substr(8, 4), 
        hash.substr(12, 4),
        hash.substr(16, 4),
        hash.substr(20, 12)
      ].join('-');
      console.log('✅ Generated UUID from identifier:', final_user_id);
    }
    
    // Test with the resolved user ID
    const { data: apiData, error: apiError } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', final_user_id)
      .order('date', { ascending: false });
      
    if (apiError) {
      console.error('❌ API Logic Error:', apiError);
      return;
    }
    
    console.log(`✅ API Logic Result: ${apiData.length} dive logs found`);
    
    // 6. Check if there's a frontend-backend mismatch
    if (data.length !== apiData.length) {
      console.log('⚠️ Mismatch between direct query and API logic!');
    } else {
      console.log('✅ Direct query and API logic match perfectly');
    }
    
  } catch (err) {
    console.error('❌ Connection Error:', err.message);
  }
}

simulateFrontendLogic().catch(console.error);
