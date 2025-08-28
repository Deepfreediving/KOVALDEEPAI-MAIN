#!/usr/bin/env node
// Simple test to check dive logs functionality

console.log('🔍 Testing dive logs storage and retrieval...\n');

// Test localStorage simulation
function testLocalStorage() {
  console.log('📱 Testing localStorage functionality:');
  
  // Simulate localStorage for dive logs
  const storageKey = 'kovalDiveLogs_daniel_koval';
  
  // Check current storage
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem(storageKey);
    console.log(`   Storage key: ${storageKey}`);
    console.log(`   Stored data: ${stored ? 'Found' : 'Empty'}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log(`   Parsed logs count: ${Array.isArray(parsed) ? parsed.length : 'Invalid format'}`);
      } catch (e) {
        console.log(`   Parse error: ${e.message}`);
      }
    }
  } else {
    console.log('   ❌ localStorage not available (Node.js environment)');
  }
}

// Test user identifier logic
function testUserIdentifier() {
  console.log('\n👤 Testing user identifier logic:');
  
  // Simulate the getUserIdentifier function from the app
  function getUserIdentifier() {
    // Check localStorage first
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedUser = localStorage.getItem('kovalUser');
      if (storedUser && storedUser !== 'anonymous') {
        console.log(`   Found stored user: ${storedUser}`);
        return storedUser;
      }
    }
    
    // Check profile
    const profile = { nickname: 'daniel_koval', displayName: 'Daniel Koval' };
    if (profile.nickname && profile.nickname !== 'anonymous') {
      console.log(`   Using profile nickname: ${profile.nickname}`);
      return profile.nickname;
    }
    
    console.log('   Fallback to anonymous');
    return 'anonymous';
  }
  
  const userId = getUserIdentifier();
  console.log(`   Final user identifier: ${userId}`);
  return userId;
}

// Test API endpoint structure
function testAPIEndpoint() {
  console.log('\n🌐 Testing API endpoint structure:');
  
  const userId = 'daniel_koval';
  const apiUrl = `/api/supabase/dive-logs?userId=${encodeURIComponent(userId)}`;
  console.log(`   API endpoint: ${apiUrl}`);
  
  // Test user ID transformation (from the API code)
  const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const adminPatterns = ['daniel_koval', 'Daniel Koval', 'daniel@deepfreediving.com', 'danielkoval@example.com'];
  
  let final_user_id;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  
  if (isUUID) {
    final_user_id = userId;
    console.log(`   UUID detected: ${final_user_id}`);
  } else if (adminPatterns.includes(userId)) {
    final_user_id = ADMIN_USER_ID;
    console.log(`   Admin pattern detected: "${userId}" → ${ADMIN_USER_ID}`);
  } else {
    // Create deterministic UUID
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    final_user_id = [
      hash.substr(0, 8),
      hash.substr(8, 4), 
      hash.substr(12, 4),
      hash.substr(16, 4),
      hash.substr(20, 12)
    ].join('-');
    console.log(`   Generated UUID: ${userId} → ${final_user_id}`);
  }
  
  return final_user_id;
}

// Main test execution
console.log('🚀 Starting dive logs debug test...\n');

testLocalStorage();
const userId = testUserIdentifier();
const finalUserId = testAPIEndpoint();

console.log('\n📊 Summary:');
console.log(`   User identifier: ${userId}`);
console.log(`   Final UUID: ${finalUserId}`);
console.log('\n✅ Debug test completed');
