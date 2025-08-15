#!/usr/bin/env node

/**
 * FINAL FIELD MAPPING AUDIT - KOVAL DEEP AI
 * 
 * This script identifies ALL remaining usage of userId/member._id
 * and ensures everything uses the exact Wix collection field names:
 * 
 * ALLOWED FIELDS (matching Wix collections):
 * - nickname (primary identifier)
 * - firstName 
 * - lastName
 * - logEntry (JSON string of dive log data)
 * - diveLogId (auto-generated for each log)
 * 
 * FORBIDDEN FIELDS:
 * - userId (should be replaced with nickname)
 * - member._id (should not be used for data storage)
 * - user.id (should not be used for data storage)
 * - memberId (should not be used for data storage)
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 FINAL FIELD MAPPING AUDIT - KOVAL DEEP AI');
console.log('===============================================\n');

const projectRoot = '/Users/danielkoval/Documents/buildaiagent/KovalDeepAI-main';
const patterns = {
  forbidden: [
    /userId/g,  // All userId references
    /member\._id/g,
    /user\.id/g,
    /memberId/g
  ],
  storage: [
    /localStorage\.(?:get|set)Item\([^)]*userId/g,
    /localStorage\.(?:get|set)Item\([^)]*member/g,
    /storageKey.*userId/g
  ],
  api: [
    /\/api\/.*userId/g,
    /\.query\.userId/g,
    /userId\s*[:=]/g
  ]
};

const fileExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];
const excludeDirs = ['node_modules', '.git', '.next', 'dist', 'build'];

function shouldScanFile(filePath) {
  const ext = path.extname(filePath);
  const dir = path.dirname(filePath);
  
  return fileExtensions.includes(ext) && 
         !excludeDirs.some(excludeDir => dir.includes(excludeDir));
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(projectRoot, filePath);
    const issues = [];

    // Check for forbidden patterns
    patterns.forbidden.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'forbidden',
          pattern: pattern.source,
          matches: matches.length,
          context: 'Field name usage'
        });
      }
    });

    // Check for storage patterns
    patterns.storage.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'storage',
          pattern: pattern.source,
          matches: matches.length,
          context: 'LocalStorage usage'
        });
      }
    });

    // Check for API patterns
    patterns.api.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'api',
          pattern: pattern.source,
          matches: matches.length,
          context: 'API endpoint usage'
        });
      }
    });

    if (issues.length > 0) {
      console.log(`\n❌ ISSUES FOUND: ${relativePath}`);
      issues.forEach(issue => {
        console.log(`   ${issue.type.toUpperCase()}: ${issue.matches} matches of "${issue.pattern}" (${issue.context})`);
      });
      
      // Show specific lines for context
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        if (patterns.forbidden.some(pattern => pattern.test(line)) ||
            patterns.storage.some(pattern => pattern.test(line)) ||
            patterns.api.some(pattern => pattern.test(line))) {
          console.log(`   Line ${lineNum}: ${line.trim()}`);
        }
      });
    }

    return issues.length;
  } catch (error) {
    console.log(`❌ Error scanning ${filePath}: ${error.message}`);
    return 0;
  }
}

function scanDirectory(dir) {
  let totalIssues = 0;
  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !excludeDirs.includes(entry)) {
      totalIssues += scanDirectory(fullPath);
    } else if (stat.isFile() && shouldScanFile(fullPath)) {
      totalIssues += scanFile(fullPath);
    }
  }

  return totalIssues;
}

// Run the audit
console.log('📂 Scanning project files...\n');
const totalIssues = scanDirectory(projectRoot);

console.log('\n===============================================');
console.log('📊 AUDIT SUMMARY');
console.log('===============================================');

if (totalIssues === 0) {
  console.log('✅ ALL CLEAR! No forbidden field usage found.');
  console.log('✅ Project is properly using Wix collection field names.');
} else {
  console.log(`❌ TOTAL ISSUES FOUND: ${totalIssues}`);
  console.log('\n🔧 REQUIRED FIXES:');
  console.log('   1. Replace userId with nickname for data storage/queries');
  console.log('   2. Update localStorage keys to use nickname');
  console.log('   3. Update API endpoints to use nickname parameter');
  console.log('   4. Ensure all data operations use: nickname, firstName, lastName, logEntry');
}

console.log('\n📋 CORRECT FIELD MAPPING:');
console.log('   ✅ nickname (primary identifier)');
console.log('   ✅ firstName');
console.log('   ✅ lastName'); 
console.log('   ✅ logEntry (JSON string)');
console.log('   ✅ diveLogId (auto-generated)');
console.log('\n❌ FORBIDDEN FIELDS:');
console.log('   ❌ userId (for data storage)');
console.log('   ❌ member._id (for data storage)');
console.log('   ❌ user.id (for data storage)');
console.log('   ❌ memberId (for data storage)');
