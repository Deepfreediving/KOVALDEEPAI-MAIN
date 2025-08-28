#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up knowledge folder structure...\n');

const dataDir = path.join(__dirname, 'data');
const knowledgeDir = path.join(__dirname, 'knowledge');

// Function to convert .md files to .txt files and move them
function moveAndConvertFiles(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    console.log(`❌ Source directory ${sourceDir} doesn't exist`);
    return;
  }

  const items = fs.readdirSync(sourceDir, { withFileTypes: true });
  
  for (const item of items) {
    const sourcePath = path.join(sourceDir, item.name);
    
    if (item.isDirectory()) {
      // Create corresponding directory in data folder
      const targetSubDir = path.join(targetDir, item.name);
      if (!fs.existsSync(targetSubDir)) {
        fs.mkdirSync(targetSubDir, { recursive: true });
        console.log(`📁 Created directory: ${path.relative(__dirname, targetSubDir)}`);
      }
      moveAndConvertFiles(sourcePath, targetSubDir);
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      const baseName = path.basename(item.name, ext);
      
      if (ext === '.md' || ext === '.txt') {
        // Convert to .txt and move to data folder
        const targetPath = path.join(targetDir, `${baseName}.txt`);
        
        // Check if file already exists
        if (fs.existsSync(targetPath)) {
          console.log(`⚠️  File already exists: ${path.relative(__dirname, targetPath)} - skipping`);
          continue;
        }
        
        // Copy and convert
        const content = fs.readFileSync(sourcePath, 'utf8');
        fs.writeFileSync(targetPath, content);
        console.log(`✅ Moved: ${path.relative(__dirname, sourcePath)} → ${path.relative(__dirname, targetPath)}`);
      }
    }
  }
}

// Check if knowledge directory exists
if (fs.existsSync(knowledgeDir)) {
  console.log('📋 Moving files from knowledge/ to data/...');
  moveAndConvertFiles(knowledgeDir, dataDir);
  
  console.log('\n🗑️  Knowledge folder contents moved. You can now safely delete the knowledge/ folder.');
  console.log('⚠️  Manual action required: Delete the knowledge/ folder after verification');
} else {
  console.log('✅ No knowledge/ folder found - your setup is already clean!');
}

// Verify data folder structure
console.log('\n📊 Current data/ folder structure:');
function showDataStructure(dir, indent = '') {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.name.startsWith('.')) continue;
    
    const itemPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      console.log(`${indent}📁 ${item.name}/`);
      showDataStructure(itemPath, indent + '  ');
    } else if (item.name.endsWith('.txt')) {
      const stats = fs.statSync(itemPath);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`${indent}📄 ${item.name} (${sizeKB}KB)`);
    }
  }
}

showDataStructure(dataDir);

console.log('\n✅ Knowledge folder cleanup complete!');
console.log('🔄 Next step: Re-run the ingestion script to update your knowledge base');
