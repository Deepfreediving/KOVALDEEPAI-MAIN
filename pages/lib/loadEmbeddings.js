// loadEmbeddings.js in the app/lib directory
const path = require('path');
const fs = require('fs');
const getAllTxtFiles = require('./getAllTxtFiles'); // Adjust the path as needed
const getEmbedding = require('./getEmbedding');     // Adjust the path as needed
const index = require('./index');                   // Adjust the path as needed

async function loadDocuments() {
  const dataFolder = path.join(process.cwd(), 'data'); // Ensure the data folder is correct
  const files = getAllTxtFiles(dataFolder);  // Get all .txt files

  const embedded = [];

  for (const file of files) {
    const text = fs.readFileSync(file.fullPath, 'utf-8'); // Read file content
    const embedding = await getEmbedding(text);         // Get embedding for the text
    embedded.push({
      id: file.relativePath,
      values: embedding,
      metadata: { text },
    });
  }

  console.log('📦 Prepared vectors for upsert:', embedded);

  // Ensure embedded is an array
  if (!Array.isArray(embedded)) {
    console.error("❌ 'embedded' is not an array. Value:", embedded);
    return;
  }

  // Upsert to Pinecone
  const result = await index.upsert({ records: embedded });  // Pinecone v1 SDK
  console.log('✅ Upsert complete:', result);
}

module.exports = { loadDocuments };
