import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });
const index = pinecone.Index(process.env.PINECONE_INDEX || '');

// === CONFIG ===
const LESSONS_DIR = path.join(process.cwd(), 'data', 'koval-lessons');

// Helper: Recursively scan directory
function scanFiles(dirPath: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dirPath);
  list.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(scanFiles(fullPath));
    } else if (/\.(txt|md|json)$/i.test(file)) {
      results.push(fullPath);
    }
  });
  return results;
}

// Helper: Create embedding
async function createEmbedding(content: string): Promise<number[]> {
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: content,
  });
  return embedding.data[0].embedding;
}

// Extract metadata
function extractMetadata(filePath: string) {
  const folder = path.basename(path.dirname(filePath));
  const name = path.basename(filePath);
  const depthMatch = name.match(/(\d{1,3})m/i);
  return {
    topic: folder,
    depth: depthMatch ? parseInt(depthMatch[1]) : null,
    fileName: name,
  };
}

async function uploadLessons() {
  console.log('🚀 Starting knowledge upload...');
  const files = scanFiles(LESSONS_DIR);

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (!content.trim()) continue;

      const embedding = await createEmbedding(content);
      const metadata = extractMetadata(file);

      await index.upsert([
        {
          id: `${metadata.fileName}-${Date.now()}`,
          values: embedding,
          metadata: {
            text: content,
            topic: metadata.topic,
            ...(metadata.depth !== null && metadata.depth !== undefined ? { depth: metadata.depth } : {}),
            file: metadata.fileName,
          },
        },
      ]);

      console.log(`✅ Uploaded: ${metadata.fileName} (${metadata.topic}, ${metadata.depth || 'no depth'})`);
    } catch (err: any) {
      console.error(`❌ Failed to upload ${file}:`, err.message);
    }
  }

  console.log('🎉 Knowledge upload complete!');
}

uploadLessons();
