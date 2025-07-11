const path = require('path');
const fs = require('fs');
const getAllTxtFiles = require('./getAllTxtFiles'); // Ensure the path to getAllTxtFiles is correct
const { getEmbedding } = require('./getEmbedding'); // Ensure the correct import from getEmbedding.js
const { index } = require('./index'); // Ensure the correct import from index.js

async function loadDocuments() {
  const dataFolder = path.join(process.cwd(), 'data'); // Adjust path to your 'data' directory
  const files = getAllTxtFiles(dataFolder);  // Get all .txt files

  const embedded = [];

  for (const file of files) {
    try {
      const text = fs.readFileSync(file.fullPath, 'utf-8'); // Read file content
      const embedding = await getEmbedding(text);         // Get embedding for the text

      embedded.push({
        id: file.relativePath,
        values: embedding,
        metadata: { text },
      });
    } catch (err) {
      console.error(`Error processing file ${file.relativePath}:`, err);
    }
  }

  console.log('📦 Prepared vectors for upsert:', embedded);

  // Ensure embedded is an array
  if (!Array.isArray(embedded)) {
    console.error("❌ 'embedded' is not an array. Value:", embedded);
    return;
  }

  // Upsert to Pinecone (v1 SDK)
  try {
    const result = await index.upsert({ records: embedded });
    console.log('✅ Upsert complete:', result);
  } catch (error) {
    console.error('❌ Error during Pinecone upsert:', error);
  }
}

module.exports = { loadDocuments };
