// scripts/ingest-documents.js
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { encode } from 'gpt-3-encoder';

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function embedAndUpsert() {
  const index = pinecone.Index(PINECONE_INDEX_NAME);
  const filesDir = path.join(process.cwd(), 'data');
  const files = fs.readdirSync(filesDir);

  for (const file of files) {
    const filePath = path.join(filesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const chunks = chunkText(content, 500); // 500 token chunks

    const vectors = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk,
      });

      vectors.push({
        id: `${file}-${i}`,
        values: embedding.data[0].embedding,
        metadata: {
          file,
          chunkIndex: i,
          text: chunk,
        },
      });
    }

    await index.upsert(vectors);
    console.log(`✅ Uploaded ${file} to Pinecone`);
  }
}

function chunkText(text, maxTokens = 500) {
  const sentences = text.split(/\.\s+/);
  const chunks = [];
  let chunk = '';

  for (const sentence of sentences) {
    const tokens = encode(chunk + sentence);
    if (tokens.length > maxTokens) {
      chunks.push(chunk.trim());
      chunk = sentence;
    } else {
      chunk += sentence + '. ';
    }
  }
  if (chunk) chunks.push(chunk.trim());
  return chunks;
}

embedAndUpsert().catch(console.error);
