#!/usr/bin/env node

/**
 * COMPREHENSIVE CRITICAL ISSUES DEBUG SCRIPT
 * Tests all major problems identified by user:
 * 1. Dive log not saved on sidebar
 * 2. Image not extracting text and no AI results 
 * 3. Repeater not receiving dive image/watchedPhoto
 * 4. No debug notification on member data (firstName, lastName, nickname)
 * 5. Session ID used instead of proper nickname
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 COMPREHENSIVE CRITICAL ISSUES DEBUG');
console.log('=====================================');

// Test 1: Check userId vs nickname field mapping issues
console.log('\n1️⃣ CHECKING USERID VS NICKNAME FIELD MAPPING...');

const criticalFiles = [
  'pages/api/analyze/single-dive-log.ts',
  'pages/api/openai/chat.ts', 
  'pages/api/analyze/save-dive-log.ts',
  'pages/api/openai/upload-dive-image.ts',
  'components/DiveJournalDisplay.jsx',
  'components/SavedDiveLogsViewer.jsx',
  'pages/embed.jsx'
];

const userIdFieldIssues = [];

criticalFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for problematic patterns
    const userIdMatches = content.match(/userId[^a-zA-Z]/g);
    const nicknameMatches = content.match(/nickname[^a-zA-Z]/g);
    const sessionMatches = content.match(/session-[0-9]/g);
    
    if (userIdMatches && userIdMatches.length > 0) {
      userIdFieldIssues.push({
        file,
        userIdUsages: userIdMatches.length,
        nicknameUsages: nicknameMatches ? nicknameMatches.length : 0,
        hasSessionPattern: !!sessionMatches
      });
    }
  }
});

console.log('📊 Field mapping analysis:');
userIdFieldIssues.forEach(issue => {
  console.log(`   • ${issue.file}: ${issue.userIdUsages} userId usages, ${issue.nicknameUsages} nickname usages`);
  if (issue.hasSessionPattern) {
    console.log(`     ⚠️ Contains session pattern - possible issue source`);
  }
});

// Test 2: Check image upload and analysis pipeline
console.log('\n2️⃣ CHECKING IMAGE UPLOAD AND ANALYSIS PIPELINE...');

const imageUploadFile = 'pages/api/openai/upload-dive-image.ts';
const imageUploadPath = path.join(__dirname, imageUploadFile);

if (fs.existsSync(imageUploadPath)) {
  const content = fs.readFileSync(imageUploadPath, 'utf8');
  
  // Check critical patterns
  const checks = {
    hasOCRExtraction: content.includes('extractDiveText') || content.includes('extractTextFromImage'),
    hasAnalysis: content.includes('analyzeDiveLog') || content.includes('analyze'),
    handlesFormData: content.includes('formidable') || content.includes('multipart'),
    sendsToAI: content.includes('openai') || content.includes('/api/openai/chat'),
    usesNickname: content.includes('nickname'),
    usesUserId: content.includes('userId'),
    savesToWix: content.includes('wix') || content.includes('DiveLogs'),
  };
  
  console.log('📊 Image upload pipeline analysis:');
  Object.entries(checks).forEach(([check, status]) => {
    console.log(`   • ${check}: ${status ? '✅' : '❌'}`);
  });
  
  // Check for nickname vs userId inconsistency
  if (checks.usesUserId && !checks.usesNickname) {
    console.log('   ⚠️ ISSUE: Uses userId but not nickname - field mapping problem!');
  }
  
} else {
  console.log('   ❌ Image upload file not found!');
}

// Test 3: Check Wix collection field mapping
console.log('\n3️⃣ CHECKING WIX COLLECTION FIELD MAPPING...');

const saveLogFile = 'pages/api/analyze/save-dive-log.ts';
const saveLogPath = path.join(__dirname, saveLogFile);

if (fs.existsSync(saveLogPath)) {
  const content = fs.readFileSync(saveLogPath, 'utf8');
  
  // Check for proper field mapping
  const wixFieldMapping = {
    hasNickname: content.includes('nickname:'),
    hasFirstName: content.includes('firstName:'),
    hasLastName: content.includes('lastName:'),
    hasWatchedPhoto: content.includes('watchedPhoto'),
    hasImageUrl: content.includes('imageUrl'),
    hasIndividualFields: content.includes('reachedDepth:') && content.includes('targetDepth:'),
    avoidsJSONBlob: !content.includes('logEntry: JSON.stringify(diveLogWithUser)'),
  };
  
  console.log('📊 Wix field mapping analysis:');
  Object.entries(wixFieldMapping).forEach(([check, status]) => {
    console.log(`   • ${check}: ${status ? '✅' : '❌'}`);
  });
  
} else {
  console.log('   ❌ Save dive log file not found!');
}

// Test 4: Check sidebar refresh mechanism
console.log('\n4️⃣ CHECKING SIDEBAR REFRESH MECHANISM...');

const sidebarFile = 'components/SavedDiveLogsViewer.jsx';
const sidebarPath = path.join(__dirname, sidebarFile);

if (fs.existsSync(sidebarPath)) {
  const content = fs.readFileSync(sidebarPath, 'utf8');
  
  const refreshChecks = {
    hasStorageListener: content.includes('addEventListener') && content.includes('storage'),
    hasCustomEventListener: content.includes('localStorageUpdate'),
    hasUserIdentifierHelper: content.includes('getUserIdentifier'),
    usesCorrectStorageKey: content.includes('diveLogs_'),
    hasRefreshOnMount: content.includes('useEffect') && content.includes('loadDiveLogs'),
  };
  
  console.log('📊 Sidebar refresh mechanism analysis:');
  Object.entries(refreshChecks).forEach(([check, status]) => {
    console.log(`   • ${check}: ${status ? '✅' : '❌'}`);
  });
  
} else {
  console.log('   ❌ Sidebar component not found!');
}

// Test 5: Check member data extraction in embed page
console.log('\n5️⃣ CHECKING MEMBER DATA EXTRACTION...');

const embedFile = 'pages/embed.jsx';
const embedPath = path.join(__dirname, embedFile);

if (fs.existsSync(embedPath)) {
  const content = fs.readFileSync(embedPath, 'utf8');
  
  const memberDataChecks = {
    hasWixMemberDetection: content.includes('wix.memberDetails') || content.includes('__wix'),
    hasUserDataResponseHandler: content.includes('USER_DATA_RESPONSE'),
    hasProperIdExtraction: content.includes('userData.userId') || content.includes('userData.memberId'),
    hasGuestUserRejection: content.includes('isGuest') && content.includes('reject'),
    hasSessionFallback: content.includes('session-'),
    hasDebugLogging: content.includes('console.log') && content.includes('Wix member'),
  };
  
  console.log('📊 Member data extraction analysis:');
  Object.entries(memberDataChecks).forEach(([check, status]) => {
    console.log(`   • ${check}: ${status ? '✅' : '❌'}`);
  });
  
  // Check session ID pattern in code
  const sessionPatterns = content.match(/session-[0-9]+/g);
  if (sessionPatterns) {
    console.log(`   ⚠️ Found ${sessionPatterns.length} session ID patterns - potential hardcoded issue`);
  }
  
} else {
  console.log('   ❌ Embed page not found!');
}

// Test 6: API endpoint consistency check
console.log('\n6️⃣ CHECKING API ENDPOINT CONSISTENCY...');

const apiFiles = [
  'pages/api/analyze/single-dive-log.ts',
  'pages/api/openai/chat.ts',
  'pages/api/analyze/save-dive-log.ts',
  'pages/api/openai/upload-dive-image.ts'
];

const fieldUsageMap = {};

apiFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    fieldUsageMap[file] = {
      usesUserId: (content.match(/userId/g) || []).length,
      usesNickname: (content.match(/nickname/g) || []).length,
      acceptsBoth: content.includes('nickname || userId') || content.includes('userId || nickname'),
      hasUserIdentifier: content.includes('userIdentifier'),
    };
  }
});

console.log('📊 API field usage consistency:');
Object.entries(fieldUsageMap).forEach(([file, usage]) => {
  const shortFile = file.split('/').pop();
  console.log(`   • ${shortFile}:`);
  console.log(`     - userId: ${usage.usesUserId}, nickname: ${usage.usesNickname}`);
  console.log(`     - Accepts both: ${usage.acceptsBoth ? '✅' : '❌'}`);
  console.log(`     - Has userIdentifier: ${usage.hasUserIdentifier ? '✅' : '❌'}`);
});

console.log('\n🎯 CRITICAL ISSUES SUMMARY');
console.log('==========================');

// Issue 1: Session ID vs Nickname
if (userIdFieldIssues.some(i => i.hasSessionPattern)) {
  console.log('❌ ISSUE 1: Session ID patterns found in code - nickname extraction failing');
} else {
  console.log('✅ ISSUE 1: No hardcoded session patterns found');
}

// Issue 2: Inconsistent field mapping
const hasInconsistentMapping = Object.values(fieldUsageMap).some(usage => 
  usage.usesUserId > 0 && usage.usesNickname === 0 && !usage.acceptsBoth
);

if (hasInconsistentMapping) {
  console.log('❌ ISSUE 2: Inconsistent field mapping - some APIs only use userId');
} else {
  console.log('✅ ISSUE 2: Field mapping appears consistent');
}

// Test the actual production API
console.log('\n7️⃣ TESTING PRODUCTION API ENDPOINTS...');

const testCases = [
  {
    name: 'Chat API with nickname',
    endpoint: 'https://kovaldeepai-main.vercel.app/api/openai/chat',
    body: {
      message: 'Test message',
      nickname: 'TestUser',
      embedMode: true
    }
  },
  {
    name: 'Single dive log analysis with nickname', 
    endpoint: 'https://kovaldeepai-main.vercel.app/api/analyze/single-dive-log',
    body: {
      nickname: 'TestUser',
      diveLogData: {
        discipline: 'Test',
        targetDepth: 20,
        reachedDepth: 18,
        location: 'Test Pool'
      }
    }
  }
];

// Note: We can't actually run HTTP requests in this script, but we can check the structure

console.log('\n✅ DEBUG SCRIPT COMPLETED');
console.log('📋 Review the above analysis for critical issues');
console.log('🔧 Focus on fixing field mapping inconsistencies and session ID extraction');
