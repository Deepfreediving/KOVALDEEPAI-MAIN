#!/usr/bin/env node

// Test script for dive log submission flow
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testDiveLogFlow() {
  console.log('🧪 Testing Dive Log Flow...\n');

  try {
    // Step 1: Check existing users
    console.log('1️⃣ Checking existing users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    console.log(`Found ${users.users?.length || 0} users in auth.users`);
    
    let testUserId;
    if (users.users && users.users.length > 0) {
      testUserId = users.users[0].id;
      console.log(`Using existing user: ${testUserId} (${users.users[0].email})`);
    } else {
      // Create a test user
      console.log('Creating test user...');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'test@kovaldeepai.dev',
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: { full_name: 'Test User' }
      });
      
      if (createError) {
        console.error('Error creating test user:', createError);
        return;
      }
      
      testUserId = newUser.user.id;
      console.log(`Created test user: ${testUserId}`);
    }

    // Step 2: Test dive log creation via API
    console.log('\n2️⃣ Testing dive log creation...');
    const testDiveLog = {
      date: '2025-01-08',
      discipline: 'CWT',
      location: 'Blue Hole, Egypt',
      targetDepth: 30,
      reachedDepth: 28,
      notes: 'Test dive log from script',
      user_id: testUserId
    };

    const response = await fetch('http://localhost:3000/api/supabase/save-dive-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testDiveLog)
    });

    const result = await response.json();
    if (response.ok && result.success) {
      console.log('✅ Dive log created successfully!');
      console.log('Created log ID:', result.diveLog.id);
      
      // Step 3: Test retrieval
      console.log('\n3️⃣ Testing dive log retrieval...');
      const getResponse = await fetch(`http://localhost:3000/api/dive/batch-logs?userId=${testUserId}&limit=10`);
      const getLogs = await getResponse.json();
      
      if (getLogs.success) {
        console.log(`✅ Retrieved ${getLogs.diveLogs.length} dive logs`);
        if (getLogs.diveLogs.length > 0) {
          console.log('Sample log:', {
            id: getLogs.diveLogs[0].id,
            date: getLogs.diveLogs[0].date,
            discipline: getLogs.diveLogs[0].discipline,
            location: getLogs.diveLogs[0].location
          });
        }
      } else {
        console.error('❌ Failed to retrieve dive logs:', getLogs.error);
      }

      // Step 4: Test deletion
      console.log('\n4️⃣ Testing dive log deletion...');
      const deleteResponse = await fetch('http://localhost:3000/api/supabase/delete-dive-log', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId: result.diveLog.id })
      });

      const deleteResult = await deleteResponse.json();
      if (deleteResponse.ok && deleteResult.success) {
        console.log('✅ Dive log deleted successfully!');
      } else {
        console.error('❌ Delete failed:', deleteResult.error);
        console.log('Note: Delete API is admin-scoped, may fail for regular users');
      }

    } else {
      console.error('❌ Failed to create dive log:', result.error || result.details);
    }

    console.log('\n🎯 Test complete! Check the app at http://localhost:3000');
    console.log(`📋 Test user credentials: test@kovaldeepai.dev / TestPassword123!`);
    console.log(`🆔 Test user ID: ${testUserId}`);

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testDiveLogFlow();
