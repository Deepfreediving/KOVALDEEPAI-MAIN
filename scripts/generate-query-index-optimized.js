/**
 * 🎯 OPTIMIZED DANIEL KOVAL KNOWLEDGE INDEX GENERATOR
 * 
 * Memory-efficient version that processes files in batches
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Extract key topics with optimized processing
 */
function extractTopicsAndSynonyms(content, fileName, dirName) {
  const contentLower = content.toLowerCase();
  
  // Safety topics (highest priority) - optimized detection
  if (contentLower.includes('4 rules of direct supervision') || contentLower.includes('one up') && contentLower.includes('one down')) {
    return {
      title: '4 Rules of Direct Supervision',
      synonyms: ['four rules', 'direct supervision', 'one up one down', 'arm\'s reach', 'triple ok', '30 seconds'],
      mustTerms: ['one up', 'one down', 'arm\'s reach', 'triple ok', '30 second'],
      botMustSay: extractBotMustSay(content),
      canonical: true,
      priority: 1
    };
  }

  if (contentLower.includes('lmc') || contentLower.includes('loss of motor control')) {
    return {
      title: 'Loss of Motor Control (LMC)',
      synonyms: ['lmc', 'loss of motor control', 'surface blackout', 'seizure spasms'],
      mustTerms: ['lmc', 'surface', 'motor control'],
      botMustSay: extractBotMustSay(content),
      canonical: true,
      priority: 1
    };
  }

  if (contentLower.includes('blackout') && (contentLower.includes('depth') || contentLower.includes('underwater'))) {
    return {
      title: 'Blackout at Depth',
      synonyms: ['underwater blackout', 'depth blackout', 'laryngospasm', 'rescue protocol'],
      mustTerms: ['blackout', 'depth', 'rescue'],
      canonical: true,
      priority: 1
    };
  }

  // Simplified detection for other topics
  const topicMap = {
    'frenzel': { title: 'Frenzel Equalization', priority: 2, canonical: true },
    'mouthfill': { title: 'Mouthfill Equalization', priority: 2, canonical: true },
    'enclose': { title: 'ENCLOSE Methodology', priority: 2, canonical: true },
    'co2': { title: 'CO2 Management', priority: 3 },
    'mdr': { title: 'Mammalian Dive Reflex', priority: 3 },
    'npd': { title: 'No Packing Dive', priority: 3 },
    'equipment': { title: 'Equipment', priority: 4 }
  };

  for (const [key, config] of Object.entries(topicMap)) {
    if (contentLower.includes(key) || dirName.toLowerCase().includes(key)) {
      return {
        title: config.title,
        synonyms: [key, config.title.toLowerCase()],
        mustTerms: [key],
        canonical: config.canonical || false,
        priority: config.priority
      };
    }
  }

  // Default
  const title = fileName.replace(/_/g, ' ').replace(/\.(txt|md)$/i, '');
  return {
    title,
    synonyms: [title.toLowerCase()],
    mustTerms: [],
    canonical: false,
    priority: 5
  };
}

function extractBotMustSay(content) {
  const match = content.match(/Bot Must Say:\s*["]?([^"\n]+)["]?/i);
  return match ? match[1].trim() : undefined;
}

function mapDirectoryToCategory(dirName) {
  const categoryMap = {
    'Safety': 'safety',
    'Equalization': 'equalization',
    'mouthfill': 'equalization',
    'physics': 'fundamentals',
    'rules': 'coaching',
    'training plan structure': 'training',
    'co2 and o2': 'physiology',
    'mdr': 'physiology',
    'npd': 'training',
    'equipment': 'equipment',
    'Fii level 1 progression': 'training',
    'enclose and clear': 'coaching'
  };
  return categoryMap[dirName] || 'general';
}

async function processFile(filePath, dirName) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Skip very large files to avoid memory issues
    if (content.length > 50000) {
      console.log(`⚠️  Skipping large file: ${fileName} (${content.length} chars)`);
      return null;
    }
    
    const topicData = extractTopicsAndSynonyms(content, fileName, dirName);
    const contentHash = crypto.createHash('md5').update(content.slice(0, 10000)).digest('hex');
    
    // Estimate chunk count without creating actual chunks
    const estimatedChunks = Math.ceil(content.length / 1200);
    const chunkIds = Array.from({length: estimatedChunks}, (_, i) => 
      `${path.basename(filePath, path.extname(filePath))}_chunk_${i}`
    );
    
    const item = {
      id: `${dirName}_${fileName.replace(/\.(txt|md)$/i, '')}`.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      title: topicData.title,
      category: mapDirectoryToCategory(dirName),
      author: 'Daniel Koval',
      canonical: topicData.canonical,
      synonyms: topicData.synonyms,
      must_terms: topicData.mustTerms,
      bot_must_say: topicData.botMustSay,
      file_path: relativePath,
      chunk_ids: chunkIds,
      priority: topicData.priority,
      content_hash: contentHash
    };
    
    console.log(`✅ Indexed: ${topicData.title}`);
    return item;
    
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
    return null;
  }
}

async function processDirectory(dirPath, dirName) {
  const items = [];
  
  try {
    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
      if (file.endsWith('.txt') || file.endsWith('.md')) {
        const filePath = path.join(dirPath, file);
        const item = await processFile(filePath, dirName);
        if (item) {
          items.push(item);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirName}:`, error.message);
  }
  
  return items;
}

async function generateKnowledgeIndex() {
  console.log('🚀 Generating Optimized Daniel Koval Knowledge Index...');
  console.log('====================================================');
  
  const dataDir = path.join(process.cwd(), 'data');
  const outputPath = path.join(process.cwd(), 'apps', 'web', 'knowledge', 'koval-knowledge-index.json');
  
  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  
  const items = [];
  
  try {
    const entries = await fs.readdir(dataDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        console.log(`📂 Processing directory: ${entry.name}`);
        const subDir = path.join(dataDir, entry.name);
        const subItems = await processDirectory(subDir, entry.name);
        items.push(...subItems);
        
        // Force garbage collection every few directories
        if (global.gc) {
          global.gc();
        }
      }
    }
  } catch (error) {
    console.error('Error processing data directory:', error);
    return;
  }
  
  // Sort by priority (safety first)
  items.sort((a, b) => a.priority - b.priority);
  
  // Get unique categories
  const categories = [...new Set(items.map(item => item.category))];
  
  // Create final index
  const index = {
    generated_at: new Date().toISOString(),
    version: '2.0.0',
    total_items: items.length,
    defaults: {
      topK: 8,
      alpha: 0.5,
      confidence: 0.85
    },
    categories,
    items
  };
  
  // Write to file
  await fs.writeFile(outputPath, JSON.stringify(index, null, 2), 'utf-8');
  
  console.log(`\n✅ Knowledge Index Generated Successfully!`);
  console.log(`📊 Total items: ${items.length}`);
  console.log(`📂 Categories: ${categories.join(', ')}`);
  console.log(`💾 Saved to: ${outputPath}`);
  
  // Generate summary
  const priorityCounts = items.reduce((acc, item) => {
    acc[item.priority] = (acc[item.priority] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`\n📈 Priority Distribution:`);
  console.log(`   Priority 1 (Safety): ${priorityCounts[1] || 0} items`);
  console.log(`   Priority 2 (Core): ${priorityCounts[2] || 0} items`);
  console.log(`   Priority 3 (Advanced): ${priorityCounts[3] || 0} items`);
  console.log(`   Priority 4 (Equipment): ${priorityCounts[4] || 0} items`);
  console.log(`   Priority 5 (General): ${priorityCounts[5] || 0} items`);
  
  console.log(`\n🎯 Canonical items: ${items.filter(i => i.canonical).length}`);
  console.log(`📋 Bot Must Say instructions: ${items.filter(i => i.bot_must_say).length}`);
}

// Run if called directly
if (require.main === module) {
  generateKnowledgeIndex().catch(console.error);
}

module.exports = { generateKnowledgeIndex };
