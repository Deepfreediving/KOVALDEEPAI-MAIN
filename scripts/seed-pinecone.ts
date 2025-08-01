import fs from 'fs';
import path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });
const index = pinecone.index(process.env.PINECONE_INDEX || '');

const DATA_DIR = path.join(process.cwd(), 'data', 'koval-lessons');

// Helper: Split text into chunks
function chunkText(text: string, maxLength = 500): string[] {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += ' ' + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return res.data[0].embedding;
}

async function processFile(filePath: string) {
  const fileName = path.basename(filePath);
  const rawText = fs.readFileSync(filePath, 'utf-8');
  const chunks = chunkText(rawText);

  console.log(`📂 Processing: ${fileName} (${chunks.length} chunks)`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embedText(chunk);

    await index.upsert([
      {
        id: `${fileName}_${i}`,
        values: embedding,
        metadata: {
          source: fileName,
          chunkIndex: i,
          text: chunk,
          approvedBy: 'Koval',
          depthRange: 'all',
        },
      },
    ]);
  }
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error('❌ No koval-lessons directory found.');
    return;
  }

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.txt'));

  if (files.length === 0) {
    console.log('⚠️ No .txt files found in koval-lessons folder.');
    return;
  }

  for (const file of files) {
    await processFile(path.join(DATA_DIR, file));
  }

  console.log('✅ Pinecone seeding completed.');
}

main().catch(err => console.error('❌ Error seeding Pinecone:', err));
