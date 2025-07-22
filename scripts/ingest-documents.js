// scripts/ingest-documents.js (CommonJS)

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
const { encode } = require('gpt-3-encoder');

// Load env variables
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!PINECONE_INDEX_NAME || typeof PINECONE_INDEX_NAME !== 'string') {
  throw new Error('❌ Missing or invalid PINECONE_INDEX in .env');
}
if (!PINECONE_API_KEY) {
  throw new Error('❌ Missing PINECONE_API_KEY in .env');
}
if (!OPENAI_API_KEY) {
  throw new Error('❌ Missing OPENAI_API_KEY in .env');
}

// Init clients
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Recursively find all .txt files
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

// Token-based chunking
function chunkText(text, maxTokens = 500) {
  const sentences = text.split(/\.\s+/);
  const chunks = [];
  let chunk = '';

  for (const sentence of sentences) {
    const tokens = encode(chunk + sentence);
    if (tokens.length > maxTokens) {
      if (chunk) chunks.push(chunk.trim());
      chunk = sentence;
    } else {
      chunk += sentence + '. ';
    }
  }

  if (chunk) chunks.push(chunk.trim());
  return chunks;
}

// Embedding + Upsert loop
async function embedAndUpsert() {
  console.log('🔍 Checking Pinecone index...');
  await pinecone.describeIndex(PINECONE_INDEX_NAME);

  const index = pinecone.Index(PINECONE_INDEX_NAME);
  const files = getAllTxtFiles(path.join(process.cwd(), 'data'));

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
    console.log(`✅ Uploaded ${relativePath} with ${vectors.length} vectors.`);
  }
}

embedAndUpsert().catch((err) => {
  console.error('❌ Embedding/upserting failed:', err);
});
