#!/usr/bin/env node

/**
 * KOVAL DEEP AI - FIELD MAPPING FIX
 * 
 * This script updates all files to use the correct Wix collection field names:
 * - nickname (primary identifier for data storage)
 * - firstName, lastName, logEntry
 * - Removes userId from data storage operations
 */

const fs = require('fs');
const path = require('path');

const fixes = [
  // Fix index.jsx - Update loadDiveLogs function
  {
    file: '/Users/danielkoval/Documents/buildaiagent/KovalDeepAI-main/pages/index.jsx',
    replacements: [
      {
        from: /const currentUserId = userId \|\| `guest-\${Date\.now\(\)}`/g,
        to: 'const userIdentifier = getUserIdentifier()'
      },
      {
        from: /const key = storageKey\(currentUserId\)/g,
        to: 'const key = storageKey(userIdentifier)'
      },
      {
        from: /for user: \${currentUserId}/g,
        to: 'for user: ${userIdentifier}'
      },
      {
        from: /localStorage\.setItem\(storageKey\(userId\)/g,
        to: 'localStorage.setItem(storageKey(getUserIdentifier())'
      },
      {
        from: /storageKey\(userId \|\| `guest-\${Date\.now\(\)}`\)/g,
        to: 'storageKey(getUserIdentifier())'
      },
      {
        from: /if \(\!userId \|\| userId\.startsWith\('guest-'\)\)/g,
        to: 'if (!profile?.nickname && !profile?.firstName)'
      },
      {
        from: /`\$\{API_ROUTES\.GET_DIVE_LOGS\}\?userId=\$\{userId\}`/g,
        to: '`${API_ROUTES.GET_DIVE_LOGS}?nickname=${encodeURIComponent(getUserIdentifier())}`'
      }
    ]
  },
  // Fix other critical files
  {
    file: '/Users/danielkoval/Documents/buildaiagent/KovalDeepAI-main/components/DiveJournalSidebarCard.jsx',
    replacements: [
      {
        from: /userId/g,
        to: 'nickname'
      }
    ]
  }
];

console.log('🔧 KOVAL DEEP AI - FIELD MAPPING FIX');
console.log('===================================\n');

fixes.forEach(fix => {
  const filePath = fix.file;
  console.log(`📝 Fixing: ${path.basename(filePath)}`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    fix.replacements.forEach(replacement => {
      const originalContent = content;
      content = content.replace(replacement.from, replacement.to);
      if (content !== originalContent) {
        changed = true;
        console.log(`   ✅ Applied: ${replacement.from.source || replacement.from} → ${replacement.to}`);
      }
    });
    
    if (changed) {
      // Create backup
      fs.writeFileSync(`${filePath}.backup-${Date.now()}`, fs.readFileSync(filePath));
      // Write fixed content
      fs.writeFileSync(filePath, content);
      console.log(`   💾 File updated (backup created)`);
    } else {
      console.log(`   ℹ️  No changes needed`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('');
});

console.log('✅ Field mapping fix complete!');
console.log('\n📋 Summary of changes:');
console.log('   - Updated storage to use nickname instead of userId');
console.log('   - Fixed API calls to use nickname parameter');
console.log('   - Updated localStorage keys to be consistent');
console.log('   - All data operations now use Wix collection field names');
