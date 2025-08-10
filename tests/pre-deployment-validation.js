/**
 * Pre-Deployment Validation Script
 * Run this before deploying to Wix to ensure all code is ready
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Running pre-deployment validation...\n');

// Test 1: Check if all required files exist
console.log('📁 Checking file structure...');

const requiredFiles = [
  'wix-site/wix-app/backend/userMemory.jsw',
  'wix-site/wix-app/backend/memberProfile.jsw',
  'wix-site/wix-app/wix-app-frontend.js',
  'wix-site/wix-page/wix-frontend-page.js',
  'public/bot-widget.js',
  'pages/embed.jsx',
  'components/Sidebar.jsx',
  'pages/api/analyze/save-dive-log.ts',
  'pages/api/wix/dive-journal-repeater.ts',
  'pages/api/openai/chat.ts'
];

let missingFiles = [];
requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.log(`\n⚠️  Missing ${missingFiles.length} required files!`);
} else {
  console.log('\n✅ All required files present');
}

// Test 2: Check backend functions for correct API usage
console.log('\n🔧 Validating backend functions...');

try {
  const userMemoryPath = path.join(__dirname, '..', 'wix-site/wix-app/backend/userMemory.jsw');
  if (fs.existsSync(userMemoryPath)) {
    const userMemoryContent = fs.readFileSync(userMemoryPath, 'utf8');
    
    // Check for correct imports
    if (userMemoryContent.includes('@wix/user-memory-backend')) {
      console.log('✅ userMemory.jsw uses correct import');
    } else if (userMemoryContent.includes('wix-users-backend')) {
      console.log('⚠️  userMemory.jsw uses legacy import (may still work)');
    } else {
      console.log('❌ userMemory.jsw missing user memory import');
    }
    
    // Check for incorrect wixData usage
    if (userMemoryContent.includes('wix-data')) {
      console.log('⚠️  userMemory.jsw still contains wix-data references');
    } else {
      console.log('✅ userMemory.jsw no wix-data references');
    }
    
    // Check for proper function exports
    if (userMemoryContent.includes('export async function saveUserMemory')) {
      console.log('✅ saveUserMemory function exported');
    } else {
      console.log('❌ saveUserMemory function not found');
    }
    
    if (userMemoryContent.includes('export async function getUserMemory')) {
      console.log('✅ getUserMemory function exported');
    } else {
      console.log('❌ getUserMemory function not found');
    }
  }
} catch (error) {
  console.log('❌ Error reading userMemory.jsw:', error.message);
}

// Test 3: Check frontend API endpoints
console.log('\n🌐 Validating API endpoints...');

try {
  const saveDiveLogPath = path.join(__dirname, '..', 'pages/api/analyze/save-dive-log.ts');
  if (fs.existsSync(saveDiveLogPath)) {
    const content = fs.readFileSync(saveDiveLogPath, 'utf8');
    
    if (content.includes('_functions/userMemory') || content.includes('saveUserMemory')) {
      console.log('✅ save-dive-log.ts calls correct backend function');
    } else {
      console.log('❌ save-dive-log.ts not calling Wix backend');
    }
    
    if (content.includes('error handling')) {
      console.log('✅ save-dive-log.ts has error handling');
    } else {
      console.log('⚠️  save-dive-log.ts may need better error handling');
    }
  }
} catch (error) {
  console.log('❌ Error reading save-dive-log.ts:', error.message);
}

// Test 4: Check widget configuration
console.log('\n📱 Validating widget configuration...');

try {
  const widgetPath = path.join(__dirname, '..', 'public/bot-widget.js');
  if (fs.existsSync(widgetPath)) {
    const content = fs.readFileSync(widgetPath, 'utf8');
    
    if (content.includes('postMessage') && content.includes('KovalAI')) {
      console.log('✅ bot-widget.js has message sending function');
    } else {
      console.log('❌ bot-widget.js missing message sending function');
    }
    
    if (content.includes('currentUserData') || content.includes('userData')) {
      console.log('✅ bot-widget.js handles user data');
    } else {
      console.log('⚠️  bot-widget.js may not handle user data properly');
    }
  }
} catch (error) {
  console.log('❌ Error reading bot-widget.js:', error.message);
}

// Test 5: Check environment variables template
console.log('\n🔑 Checking environment configuration...');

try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    console.log('✅ .env.local exists');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('WIX_SITE_URL')) {
      console.log('✅ WIX_SITE_URL configured');
    } else {
      console.log('⚠️  WIX_SITE_URL not found in .env.local');
    }
    
    if (envContent.includes('OPENAI_API_KEY')) {
      console.log('✅ OPENAI_API_KEY configured');
    } else {
      console.log('⚠️  OPENAI_API_KEY not found in .env.local');
    }
  } else {
    console.log('⚠️  .env.local not found - create it for local development');
  }
} catch (error) {
  console.log('❌ Error reading .env.local:', error.message);
}

// Test 6: Check package.json for required dependencies
console.log('\n📦 Validating dependencies...');

try {
  const packagePath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(packagePath)) {
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const requiredDeps = ['next', 'react', 'openai'];
    const missingDeps = requiredDeps.filter(dep => 
      !packageContent.dependencies?.[dep] && !packageContent.devDependencies?.[dep]
    );
    
    if (missingDeps.length === 0) {
      console.log('✅ All required dependencies present');
    } else {
      console.log(`⚠️  Missing dependencies: ${missingDeps.join(', ')}`);
    }
  }
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
}

// Summary
console.log('\n📋 VALIDATION SUMMARY');
console.log('==================');

if (missingFiles.length === 0) {
  console.log('✅ File structure: PASS');
} else {
  console.log('❌ File structure: FAIL - Missing files');
}

console.log('\n🚀 DEPLOYMENT READINESS');
console.log('====================');

if (missingFiles.length === 0) {
  console.log('✅ Code appears ready for deployment');
  console.log('\n📝 Next steps:');
  console.log('1. Deploy backend functions to Wix');
  console.log('2. Enable App Collections in Wix CMS');
  console.log('3. Update Wix page code');
  console.log('4. Deploy Next.js app to hosting platform');
  console.log('5. Test end-to-end functionality');
  console.log('\n📚 Refer to FINAL-DEPLOYMENT-CHECKLIST.md for detailed steps');
} else {
  console.log('❌ Please fix missing files before deployment');
  console.log('\n📚 Missing files listed above need to be created or fixed');
}

console.log('\n🔗 Useful documentation:');
console.log('- docs/deployment/FINAL-DEPLOYMENT-CHECKLIST.md');
console.log('- docs/deployment/WIX-ERROR-DEBUGGING.md');
console.log('- docs/deployment/DEPLOY-BACKEND-NOW.md');

console.log('\n✨ Validation complete!\n');
