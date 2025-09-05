#!/usr/bin/env node

/**
 * Comprehensive Wix Code Cleanup Script
 * Removes all Wix-related code, files, and environment variables
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workspaceRoot = '/Users/danielkoval/Documents/buildaiagent/KovalDeepAI-main';

console.log('🧹 Starting comprehensive Wix code cleanup...\n');

// Files to completely delete
const filesToDelete = [
    // Root level files
    'wix-blocks-page-code.js',
    'system-audit.js',
    'final-verification.js',
    'final-verification-v6.js',
    'comprehensive-system-audit.js',
    'test-upload-fixes.js',
    'test-live-ai-fixed.js',
    
    // Apps/web files
    'apps/web/next.config.js.backup',
    'apps/web/pages/api/health.ts',
    'apps/web/pages/api/diagnostics.ts',
    'apps/web/pages/api/verify.ts',
    'apps/web/pages/api/system/health-check.js',
    'apps/web/public/bot-widget.js',
    'apps/web/utils/getToken.js',
    'apps/web/utils/wixClient.ts',
    
    // Archived wix folder
    'archived-wix',
    'wix-site'
];

// Directories to completely delete
const dirsToDelete = [
    'archived-wix',
    'wix-site'
];

// Environment variables to remove from .env.local
const envVarsToRemove = [
    'WIX_API_KEY',
    'WIX_APP_NAMESPACE',
    'WIX_ACCOUNT_ID',
    'WIX_CLIENT_ID',
    'WIX_SITE_ID',
    'WIX_DATA_COLLECTION_ID',
    'WIX_OAUTH_CLIENT_ID',
    'WIX_OAUTH_CLIENT_SECRET',
    'WIX_ACCESS_TOKEN',
    'WIX_CLIENT_SECRET'
];

function deleteFile(filePath) {
    const fullPath = path.join(workspaceRoot, filePath);
    try {
        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                fs.rmSync(fullPath, { recursive: true, force: true });
                console.log(`   ✅ Deleted directory: ${filePath}`);
            } else {
                fs.unlinkSync(fullPath);
                console.log(`   ✅ Deleted file: ${filePath}`);
            }
        } else {
            console.log(`   ⚠️  File not found: ${filePath}`);
        }
    } catch (error) {
        console.log(`   ❌ Error deleting ${filePath}: ${error.message}`);
    }
}

function cleanEnvironmentFile() {
    console.log('\n📝 Cleaning environment variables...');
    
    const envPath = path.join(workspaceRoot, '.env.local');
    if (!fs.existsSync(envPath)) {
        console.log('   ⚠️  .env.local not found');
        return;
    }
    
    let envContent = fs.readFileSync(envPath, 'utf8');
    const originalLines = envContent.split('\n');
    
    // Remove Wix-related lines
    const cleanedLines = originalLines.filter(line => {
        const trimmedLine = line.trim();
        
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) {
            // Keep non-Wix comments
            if (trimmedLine.toLowerCase().includes('wix')) {
                return false;
            }
            return true;
        }
        
        // Check if line starts with any Wix env var
        return !envVarsToRemove.some(envVar => trimmedLine.startsWith(`${envVar}=`));
    });
    
    const cleanedContent = cleanedLines.join('\n');
    fs.writeFileSync(envPath, cleanedContent);
    
    const removedCount = originalLines.length - cleanedLines.length;
    console.log(`   ✅ Removed ${removedCount} Wix environment variables`);
}

function cleanGitignore() {
    console.log('\n📝 Cleaning .gitignore...');
    
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
        console.log('   ⚠️  .gitignore not found');
        return;
    }
    
    let content = fs.readFileSync(gitignorePath, 'utf8');
    const lines = content.split('\n');
    
    // Remove Wix-related lines
    const cleanedLines = lines.filter(line => {
        const trimmedLine = line.trim().toLowerCase();
        return !trimmedLine.includes('wix') && !trimmedLine.includes('archived-wix');
    });
    
    const cleanedContent = cleanedLines.join('\n');
    fs.writeFileSync(gitignorePath, cleanedContent);
    
    console.log('   ✅ Cleaned .gitignore');
}

function cleanEslintFiles() {
    console.log('\n📝 Cleaning ESLint configuration...');
    
    // Clean .eslintrc.json
    const eslintrcPath = path.join(workspaceRoot, '.eslintrc.json');
    if (fs.existsSync(eslintrcPath)) {
        let content = fs.readFileSync(eslintrcPath, 'utf8');
        const config = JSON.parse(content);
        
        if (config.ignorePatterns) {
            config.ignorePatterns = config.ignorePatterns.filter(pattern => 
                !pattern.toLowerCase().includes('wix')
            );
        }
        
        fs.writeFileSync(eslintrcPath, JSON.stringify(config, null, 2));
        console.log('   ✅ Cleaned .eslintrc.json');
    }
    
    // Clean .eslintignore
    const eslintignorePath = path.join(workspaceRoot, '.eslintignore');
    if (fs.existsSync(eslintignorePath)) {
        let content = fs.readFileSync(eslintignorePath, 'utf8');
        const lines = content.split('\n');
        
        const cleanedLines = lines.filter(line => {
            const trimmedLine = line.trim().toLowerCase();
            return !trimmedLine.includes('wix') && 
                   !trimmedLine.startsWith('#') ||
                   (trimmedLine.startsWith('#') && !trimmedLine.includes('wix'));
        });
        
        fs.writeFileSync(eslintignorePath, cleanedLines.join('\n'));
        console.log('   ✅ Cleaned .eslintignore');
    }
}

function cleanMiddleware() {
    console.log('\n📝 Cleaning middleware.ts...');
    
    const middlewarePath = path.join(workspaceRoot, 'middleware.ts');
    if (!fs.existsSync(middlewarePath)) {
        console.log('   ⚠️  middleware.ts not found');
        return;
    }
    
    let content = fs.readFileSync(middlewarePath, 'utf8');
    
    // Remove Wix-related lines
    const lines = content.split('\n');
    const cleanedLines = lines.filter(line => {
        const lowerLine = line.toLowerCase();
        return !lowerLine.includes('wix') && 
               !lowerLine.includes('deepfreediving.com');
    });
    
    // Also remove the CORS comment about Wix
    const finalLines = cleanedLines.map(line => {
        if (line.includes('Fix CORS issues for Wix integration')) {
            return '// Enhanced security middleware';
        }
        return line;
    });
    
    fs.writeFileSync(middlewarePath, finalLines.join('\n'));
    console.log('   ✅ Cleaned middleware.ts');
}

function cleanUploadImageAPI() {
    console.log('\n📝 Cleaning upload-dive-image-simple.js...');
    
    const apiPath = path.join(workspaceRoot, 'apps/web/pages/api/openai/upload-dive-image-simple.js');
    if (!fs.existsSync(apiPath)) {
        console.log('   ⚠️  upload-dive-image-simple.js not found');
        return;
    }
    
    let content = fs.readFileSync(apiPath, 'utf8');
    
    // Remove the Wix compression import
    content = content.replace(/import\s+{\s*compressDiveLogForWix\s*}\s+from\s+['"']@\/utils\/diveLogCompression['"'];?\s*\n?/g, '');
    
    fs.writeFileSync(apiPath, content);
    console.log('   ✅ Cleaned upload-dive-image-simple.js');
}

function findAndDeleteWixFiles() {
    console.log('\n🔍 Searching for additional Wix files...');
    
    try {
        // Find files with "wix" in the name (case insensitive)
        const findCommand = `find "${workspaceRoot}" -type f -iname "*wix*" 2>/dev/null | head -20`;
        const wixFiles = execSync(findCommand, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
        
        wixFiles.forEach(file => {
            if (file && !file.includes('node_modules') && !file.includes('.git')) {
                const relativePath = path.relative(workspaceRoot, file);
                deleteFile(relativePath);
            }
        });
        
        // Find directories with "wix" in the name
        const findDirCommand = `find "${workspaceRoot}" -type d -iname "*wix*" 2>/dev/null | head -10`;
        const wixDirs = execSync(findDirCommand, { encoding: 'utf8' }).trim().split('\n').filter(d => d);
        
        wixDirs.forEach(dir => {
            if (dir && !dir.includes('node_modules') && !dir.includes('.git')) {
                const relativePath = path.relative(workspaceRoot, dir);
                deleteFile(relativePath);
            }
        });
        
    } catch (error) {
        console.log('   ⚠️  Error searching for Wix files:', error.message);
    }
}

// Execute cleanup
console.log('📁 Deleting known Wix files and directories...');
filesToDelete.forEach(deleteFile);

console.log('\n📁 Deleting Wix directories...');
dirsToDelete.forEach(deleteFile);

findAndDeleteWixFiles();
cleanEnvironmentFile();
cleanGitignore();
cleanEslintFiles();
cleanMiddleware();
cleanUploadImageAPI();

console.log('\n✅ Wix cleanup completed!');
console.log('\n📋 Summary of actions taken:');
console.log('   • Deleted all Wix-related files and directories');
console.log('   • Removed Wix environment variables from .env.local');
console.log('   • Cleaned Wix references from middleware.ts');
console.log('   • Cleaned Wix references from .gitignore');
console.log('   • Cleaned Wix references from ESLint configuration');
console.log('   • Removed Wix imports from API files');
console.log('\n🚀 Your project is now Wix-free and ready for pure Supabase operation!');
