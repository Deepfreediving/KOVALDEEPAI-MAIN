async function loadDocuments() {
  const dataFolder = path.join(process.cwd(), 'data');
  const files = getAllTxtFiles(dataFolder);

  const embedded = [];

  for (const file of files) {
    const text = fs.readFileSync(file.fullPath, 'utf-8');
    const embedding = await getEmbedding(text);
    embedded.push({
      id: file.relativePath,
      values: embedding,
      metadata: { text },
    });
  }

  console.log('📦 Prepared vectors for upsert:', embedded);

  if (!Array.isArray(embedded)) {
    console.error("❌ 'embedded' is not an array. Value:", embedded);
    return;
  }

  const result = await index.upsert({ records: embedded }); // Pinecone v1 SDK
  console.log('✅ Upsert complete:', result);
}
