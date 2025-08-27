// Knowledge ingestion script for Koval Deep AI
// Reads markdown files from knowledge/ and data/, embeds them, and stores in Pinecone + Supabase

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { createClient } from '@supabase/supabase-js';
import { Pinecone, type PineconeRecord } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import crypto from 'crypto';

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const index = pinecone.index('koval-deep-ai');

// Chunk text into manageable pieces for embedding
function chunkText(text: string, maxChunkSize = 1200, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = Math.min(start + maxChunkSize, text.length);
    
    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > start + maxChunkSize / 2) {
        end = breakPoint + 1;
      }
    }
    
    const chunk = text.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    
    start = end - overlap;
  }
  
  return chunks.filter(chunk => chunk.length > 50); // Filter out tiny chunks
}

// Generate content hash for change detection
function generateContentHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

// Embed text using OpenAI
async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000), // Ensure we don't exceed token limits
  });
  
  return response.data[0].embedding;
}

// Process a single markdown file
async function processMarkdownFile(filePath: string, relativePath: string): Promise<void> {
  console.log(`Processing: ${relativePath}`);
  
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data: frontMatter, content } = matter(fileContent);
    
    // Generate content hash
    const contentHash = generateContentHash(content);
    
    // Check if this content has already been processed (unchanged)
    const { data: existingRecord } = await supabase
      .from('educational_content')
      .select('content_hash, pinecone_ids')
      .eq('file_path', relativePath)
      .single();
    
    if (existingRecord?.content_hash === contentHash) {
      console.log(`  ⏭️  Skipping ${relativePath} (unchanged)`);
      return;
    }
    
    // Delete old Pinecone vectors if they exist
    if (existingRecord?.pinecone_ids?.length) {
      console.log(`  🗑️  Deleting old vectors for ${relativePath}`);
      await index.deleteMany(existingRecord.pinecone_ids);
    }
    
    // Chunk the content
    const chunks = chunkText(content);
    console.log(`  📄 Split into ${chunks.length} chunks`);
    
    // Embed each chunk
    const vectors: PineconeRecord[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await embedText(chunk);
      
      const vectorId = `${frontMatter.slug || path.basename(filePath, '.md')}_chunk_${i}`;
      
      vectors.push({
        id: vectorId,
        values: embedding,
        metadata: {
          // Content metadata
          slug: frontMatter.slug || path.basename(filePath, '.md'),
          title: frontMatter.title || frontMatter.slug || path.basename(filePath, '.md'),
          topic: frontMatter.topic || 'general',
          version: frontMatter.version || 1,
          author: frontMatter.author || 'Daniel Koval',
          
          // Access control
          risk_level: frontMatter.risk_level || 'low',
          min_cert_level: frontMatter.min_cert_level || 'L1',
          water_required: frontMatter.water_required || false,
          
          // Content organization
          tags: frontMatter.tags || [],
          file_path: relativePath,
          chunk_index: i,
          chunk_count: chunks.length,
          
          // Routing hints from your methodology
          routing_hooks: frontMatter.routing_hooks || {},
          
          // Actual content for retrieval
          text: chunk,
          
          // Source tracking
          source: 'koval-knowledge-base',
          ingested_at: new Date().toISOString(),
        },
      });
    }
    
    // Upsert to Pinecone
    console.log(`  ☁️  Uploading ${vectors.length} vectors to Pinecone`);
    await index.upsert(vectors);
    
    // Update Supabase metadata
    const pineconeIds = vectors.map(v => v.id);
    const supabaseData = {
      slug: frontMatter.slug || path.basename(filePath, '.md'),
      title: frontMatter.title || frontMatter.slug || path.basename(filePath, '.md'),
      topic: frontMatter.topic || 'general',
      version: frontMatter.version || 1,
      author: frontMatter.author || 'Daniel Koval',
      risk_level: frontMatter.risk_level || 'low',
      min_cert_level: frontMatter.min_cert_level || 'L1',
      water_required: frontMatter.water_required || false,
      tags: frontMatter.tags || [],
      file_path: relativePath,
      content_hash: contentHash,
      pinecone_ids: pineconeIds,
      chunk_count: chunks.length,
      is_active: true,
    };
    
    console.log(`  💾 Updating Supabase metadata`);
    const { error } = await supabase
      .from('educational_content')
      .upsert(supabaseData, { onConflict: 'file_path' });
    
    if (error) {
      console.error(`  ❌ Supabase error for ${relativePath}:`, error);
    } else {
      console.log(`  ✅ Successfully processed ${relativePath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${relativePath}:`, error);
  }
}

// Process your existing data directory structure
async function processDataDirectory(dataDir: string): Promise<void> {
  console.log(`\n📂 Processing data directory: ${dataDir}`);
  
  const dataDirs = [
    'Safety',
    'Equalization', 
    'mouthfill',
    'physics',
    'rules',
    'training plan structure',
    'co2 and o2',
    'mdr',
    'npd',
    'equipment',
    'Fii level 1 progression',
    'enclose and clear',
  ];
  
  for (const dir of dataDirs) {
    const dirPath = path.join(dataDir, dir);
    
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        if (file.endsWith('.txt') || file.endsWith('.md')) {
          const filePath = path.join(dirPath, file);
          const relativePath = path.relative(process.cwd(), filePath);
          
          // Convert .txt files to markdown-like processing
          await processTextFile(filePath, relativePath);
        }
      }
    } catch (error) {
      console.log(`⚠️  Skipping directory ${dir}: ${error.message}`);
    }
  }
}

// Process .txt files from your existing data structure
async function processTextFile(filePath: string, relativePath: string): Promise<void> {
  console.log(`Processing TXT: ${relativePath}`);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Generate synthetic frontmatter based on file path and content
    const fileName = path.basename(filePath, '.txt');
    const dirName = path.dirname(relativePath).split('/').pop();
    
    // Determine topic and risk level from directory structure
    const topic = mapDirectoryToTopic(dirName || '');
    const risk_level = content.toLowerCase().includes('squeeze') || 
                      content.toLowerCase().includes('blackout') || 
                      content.toLowerCase().includes('safety') ? 'high' : 'medium';
    
    const min_cert_level = determineMinCertLevel(content, fileName);
    
    const frontMatter = {
      slug: fileName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
      title: fileName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      topic,
      version: 1,
      author: 'Daniel Koval',
      risk_level,
      min_cert_level,
      water_required: content.toLowerCase().includes('depth') || content.toLowerCase().includes('dive'),
      tags: extractTagsFromContent(content, fileName),
    };
    
    // Process similar to markdown
    const contentHash = generateContentHash(content);
    
    const { data: existingRecord } = await supabase
      .from('educational_content')
      .select('content_hash, pinecone_ids')
      .eq('file_path', relativePath)
      .single();
    
    if (existingRecord?.content_hash === contentHash) {
      console.log(`  ⏭️  Skipping ${relativePath} (unchanged)`);
      return;
    }
    
    if (existingRecord?.pinecone_ids?.length) {
      await index.deleteMany(existingRecord.pinecone_ids);
    }
    
    const chunks = chunkText(content);
    console.log(`  📄 Split into ${chunks.length} chunks`);
    
    const vectors: PineconeRecord[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await embedText(chunk);
      
      const vectorId = `${frontMatter.slug}_chunk_${i}`;
      
      vectors.push({
        id: vectorId,
        values: embedding,
        metadata: {
          ...frontMatter,
          file_path: relativePath,
          chunk_index: i,
          chunk_count: chunks.length,
          text: chunk,
          source: 'koval-data-archive',
          ingested_at: new Date().toISOString(),
        },
      });
    }
    
    await index.upsert(vectors);
    
    const pineconeIds = vectors.map(v => v.id);
    const supabaseData = {
      ...frontMatter,
      file_path: relativePath,
      content_hash: contentHash,
      pinecone_ids: pineconeIds,
      chunk_count: chunks.length,
      is_active: true,
    };
    
    const { error } = await supabase
      .from('educational_content')
      .upsert(supabaseData, { onConflict: 'file_path' });
    
    if (error) {
      console.error(`  ❌ Supabase error for ${relativePath}:`, error);
    } else {
      console.log(`  ✅ Successfully processed ${relativePath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${relativePath}:`, error);
  }
}

// Helper functions for content analysis
function mapDirectoryToTopic(dirName: string): string {
  const topicMap: Record<string, string> = {
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
    'enclose and clear': 'coaching',
  };
  
  return topicMap[dirName] || 'general';
}

function determineMinCertLevel(content: string, fileName: string): string {
  if (content.toLowerCase().includes('mouthfill') || 
      content.toLowerCase().includes('reverse pack') ||
      fileName.toLowerCase().includes('level 2') ||
      fileName.toLowerCase().includes('l2')) {
    return 'L2';
  }
  
  if (content.toLowerCase().includes('packing') ||
      content.toLowerCase().includes('frc') ||
      fileName.toLowerCase().includes('level 3') ||
      fileName.toLowerCase().includes('l3')) {
    return 'L3';
  }
  
  return 'L1';
}

function extractTagsFromContent(content: string, fileName: string): string[] {
  const tags: string[] = [];
  
  // Extract from filename
  const filenameTags = fileName.toLowerCase().split(/[_\-\s]+/);
  tags.push(...filenameTags);
  
  // Extract from content
  const contentLower = content.toLowerCase();
  const keyTerms = [
    'equalization', 'frenzel', 'mouthfill', 'squeeze', 'safety', 
    'blackout', 'narcosis', 'enclose', 'clear dive', 'physics',
    'training', 'btv', 'vto', 'reverse pack', 'npd', 'mdr'
  ];
  
  for (const term of keyTerms) {
    if (contentLower.includes(term)) {
      tags.push(term);
    }
  }
  
  return [...new Set(tags)].filter(tag => tag.length > 2);
}

// Main execution
async function main() {
  console.log('🚀 Starting Koval Deep AI Knowledge Ingestion');
  console.log('==============================================');
  
  const knowledgeDir = path.join(process.cwd(), 'knowledge');
  const dataDir = path.join(process.cwd(), 'data');
  
  // Process new knowledge directory structure
  try {
    const knowledgeExists = await fs.access(knowledgeDir).then(() => true).catch(() => false);
    if (knowledgeExists) {
      console.log('\n📚 Processing knowledge/ directory');
      await processDirectory(knowledgeDir);
    }
  } catch (error) {
    console.log('⚠️  No knowledge/ directory found, skipping');
  }
  
  // Process existing data directory
  try {
    const dataExists = await fs.access(dataDir).then(() => true).catch(() => false);
    if (dataExists) {
      await processDataDirectory(dataDir);
    }
  } catch (error) {
    console.log('⚠️  No data/ directory found, skipping');
  }
  
  console.log('\n✅ Knowledge ingestion complete!');
  console.log('Your expertise is now searchable and embedded in the AI system.');
}

async function processDirectory(dir: string): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.name.endsWith('.md')) {
      const relativePath = path.relative(process.cwd(), fullPath);
      await processMarkdownFile(fullPath, relativePath);
    }
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export { main as ingestKnowledge };
