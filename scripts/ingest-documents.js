// scripts/ingest-documents.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
const { encode } = require('gpt-3-encoder');

// 🔐 Load and validate env vars
const {
  PINECONE_INDEX,
  PINECONE_API_KEY,
  OPENAI_API_KEY,
} = process.env;

if (!PINECONE_INDEX || !PINECONE_API_KEY || !OPENAI_API_KEY) {
  throw new Error('❌ Missing required environment variables in .env');
}

// 🔧 Initialize clients
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 📂 Recursively get .txt files
function getAllTxtFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllTxtFiles(fullPath, fileList);
    } else if (entry.isFile() && fullPath.endsWith('.txt')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// ✂️ Chunking by token count
function chunkText(text, maxTokens = 500) {
  const sentences = text.split(/(?<=[.?!])\s+/); // Sentence-aware split
  const chunks = [];
  let chunk = '';

  for (const sentence of sentences) {
    const tokens = encode(chunk + sentence);
    if (tokens.length > maxTokens) {
      if (chunk) chunks.push(chunk.trim());
      chunk = sentence;
    } else {
      chunk += sentence + ' ';
    }
  }

  if (chunk) chunks.push(chunk.trim());
  return chunks;
}

// 🚀 Ingest all .txt files into Pinecone
async function embedAndUpsert() {
  try {
    console.log('🔍 Validating Pinecone index...');
    await pinecone.describeIndex(PINECONE_INDEX);
    const index = pinecone.Index(PINECONE_INDEX);

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      throw new Error(`❌ Directory not found: ${dataDir}`);
    }

    const files = getAllTxtFiles(dataDir);
    if (files.length === 0) {
      console.warn('⚠️ No .txt files found in /data');
      return;
    }

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative('data', filePath);
      const chunks = chunkText(content);

      const vectors = await Promise.all(
        chunks.map(async (chunk, i) => {
          const embedding = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: chunk,
          });

          return {
            id: `${relativePath.replace(/\W+/g, '_')}_${i}`,
            values: embedding.data[0].embedding,
            metadata: {
              source: relativePath,
              chunkIndex: i,
              text: chunk,
            },
          };
        })
      );

      await index.upsert(vectors);
      console.log(`✅ Uploaded: ${relativePath} (${vectors.length} chunks)`);
    }
  } catch (err) {
    console.error('❌ Ingestion failed:', err);
  }
}

// 🔁 Run
embedAndUpsert();
