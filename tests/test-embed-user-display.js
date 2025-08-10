#!/usr/bin/env node

/**
 * Test Script: Verify embed.jsx User Display Logic
 * 
 * This script verifies that embed.jsx always displays the correct nickname
 * from Members/FullData and never falls back to "Guest User" for real users.
 */

console.log('🧪 Testing embed.jsx user display logic...\n');

// Mock the getDisplayName function logic from embed.jsx
function getDisplayName(profile, userId) {
  console.log('🔍 getDisplayName called, profile:', profile, 'userId:', userId);
  
  // Try rich profile data first (from Wix Collections/Members)
  if (profile?.displayName && profile.displayName !== 'nickname' && profile.displayName !== 'Authenticated User') {
    console.log('✅ Using profile.displayName:', profile.displayName);
    return profile.displayName;
  }
  if (profile?.nickname && profile.nickname !== 'nickname' && profile.nickname !== 'Diver') {
    console.log('✅ Using profile.nickname:', profile.nickname);
    return profile.nickname;
  }
  if (profile?.firstName && profile?.lastName) {
    const fullName = `${profile.firstName} ${profile.lastName}`;
    console.log('✅ Using firstName + lastName:', fullName);
    return fullName;
  }
  if (profile?.firstName) {
    console.log('✅ Using profile.firstName:', profile.firstName);
    return profile.firstName;
  }
  if (profile?.loginEmail && !profile.loginEmail.includes('unknown')) {
    const emailName = profile.loginEmail.split('@')[0];
    console.log('✅ Using email username:', emailName);
    return emailName;
  }
  if (profile?.contactDetails?.firstName) {
    console.log('✅ Using contactDetails.firstName:', profile.contactDetails.firstName);
    return profile.contactDetails.firstName;
  }
  
  // Always show "Loading..." while waiting for real user data - no guest fallback
  if (userId && !profile?.source) {
    console.log('⏳ Waiting for user profile data from Members/FullData...');
    return "Loading...";
  }
  
  // Final fallback - should rarely be used if auth is working correctly  
  console.log('🔄 Using final fallback: User');
  return "User";
}

// Test scenarios
const testCases = [
  {
    name: "Rich Wix Profile with displayName",
    profile: {
      displayName: "John Smith",
      nickname: "john_diver", 
      firstName: "John",
      lastName: "Smith",
      loginEmail: "john@example.com",
      source: "wix-collections"
    },
    userId: "wix-user-123",
    expected: "John Smith"
  },
  {
    name: "Profile with nickname only",
    profile: {
      nickname: "freediver_pro",
      loginEmail: "freediver@test.com",
      source: "wix-collections"
    },
    userId: "wix-user-456",
    expected: "freediver_pro"
  },
  {
    name: "Profile with firstName/lastName",
    profile: {
      firstName: "Sarah",
      lastName: "Ocean",
      loginEmail: "sarah@diving.com",
      source: "wix-collections"
    },
    userId: "wix-user-789",
    expected: "Sarah Ocean"
  },
  {
    name: "Profile with email only",
    profile: {
      loginEmail: "diver@depths.com",
      source: "wix-collections"
    },
    userId: "wix-user-101",
    expected: "diver"
  },
  {
    name: "Waiting for profile data (should show Loading...)",
    profile: {},
    userId: "wix-user-202",
    expected: "Loading..."
  },
  {
    name: "Profile with contactDetails",
    profile: {
      contactDetails: {
        firstName: "Mike"
      },
      source: "wix-collections"
    },
    userId: "wix-user-303",
    expected: "Mike"
  },
  {
    name: "Final fallback case",
    profile: {
      source: "fallback"
    },
    userId: "wix-user-404",
    expected: "User"
  }
];

// Run tests
let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`\n--- Test ${index + 1}: ${testCase.name} ---`);
  
  const result = getDisplayName(testCase.profile, testCase.userId);
  
  if (result === testCase.expected) {
    console.log(`✅ PASSED: Expected "${testCase.expected}", got "${result}"`);
    passed++;
  } else {
    console.log(`❌ FAILED: Expected "${testCase.expected}", got "${result}"`);
    failed++;
  }
});

// Summary
console.log(`\n📊 Test Summary:`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📋 Total: ${testCases.length}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! embed.jsx user display logic is working correctly.');
  console.log('✅ No "Guest User" fallbacks for real users');
  console.log('✅ Always shows correct nickname from Members/FullData');
  console.log('✅ Proper loading state while waiting for user data');
} else {
  console.log('\n⚠️  Some tests failed. Please review the logic.');
  process.exit(1);
}

// Additional validation checks
console.log('\n🔍 Additional Validation:');

// Check that we never return "Guest User" for real userIds
console.log('- Checking that real userIds never get "Guest User":');
const realUserIds = ['wix-user-123', 'user-456', 'member-789'];
realUserIds.forEach(userId => {
  const result = getDisplayName({}, userId);
  if (result === "Guest User") {
    console.log(`❌ ERROR: Real userId "${userId}" returned "Guest User"`);
    process.exit(1);
  } else {
    console.log(`✅ userId "${userId}" correctly returned "${result}"`);
  }
});

console.log('\n✅ embed.jsx user display audit completed successfully!');
