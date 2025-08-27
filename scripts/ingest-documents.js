const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { Pinecone } = require("@pinecone-database/pinecone");
const { OpenAI } = require("openai");
const { encode } = require("gpt-3-encoder");

// Load environment variables from .env file
dotenv.config();

// 🔐 Validate environment variables
const PINECONE_INDEX = process.env.PINECONE_INDEX;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!PINECONE_INDEX || !PINECONE_API_KEY || !OPENAI_API_KEY) {
  throw new Error("❌ Missing required environment variables in .env");
}

// 🔧 Initialize Pinecone and OpenAI clients
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 📂 Recursively collect .txt files
function getAllTxtFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllTxtFiles(fullPath, fileList);
    } else if (entry.isFile() && fullPath.endsWith(".txt")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// ✂️ Token-aware text chunking
function chunkText(text, maxTokens = 500) {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const chunks = [];
  let chunk = "";

  for (const sentence of sentences) {
    const tokens = encode(chunk + sentence);
    if (tokens.length > maxTokens) {
      if (chunk) chunks.push(chunk.trim());
      chunk = sentence;
    } else {
      chunk += sentence + " ";
    }
  }

  if (chunk) chunks.push(chunk.trim());
  return chunks;
}

// 🚀 Embed and upsert to Pinecone
async function embedAndUpsert() {
  try {
    console.log("🔍 Validating Pinecone index...");
    if (!PINECONE_INDEX) {
      throw new Error("❌ PINECONE_INDEX is not defined");
    }
    await pinecone.describeIndex(PINECONE_INDEX);
    const index = pinecone.index(PINECONE_INDEX);

    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      throw new Error(`❌ Data directory not found: ${dataDir}`);
    }

    const files = getAllTxtFiles(dataDir);
    if (files.length === 0) {
      console.warn("⚠️ No .txt files found in /data");
      return;
    }

    console.log(`📄 Found ${files.length} .txt files to process`);

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, "utf8");
      const relativePath = path.relative("data", filePath);
      const chunks = chunkText(content);

      console.log(`📝 Processing: ${relativePath} (${chunks.length} chunks)`);

      const vectors = await Promise.all(
        chunks.map(async (chunk, i) => {
          const embedding = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: chunk,
          });

          return {
            id: `${relativePath.replace(/\W+/g, "_")}_${i}`,
            values: embedding.data[0].embedding,
            metadata: {
              source: relativePath,
              chunkIndex: i,
              text: chunk,
            },
          };
        }),
      );

      await index.upsert(vectors);
      console.log(`✅ Uploaded: ${relativePath} (${vectors.length} chunks)`);
    }

    console.log("🎉 Ingestion completed successfully!");
  } catch (err) {
    if (err instanceof Error) {
      console.error("❌ Ingestion failed:", err.message);
    } else {
      console.error("❌ Unknown error during ingestion:", err);
    }
  }
}

// 🔁 Run ingestion
embedAndUpsert();
