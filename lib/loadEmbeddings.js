import axios from "axios";
import index from "./pineconeClient"; // ✅ Pinecone client
import getEmbedding from "@/lib/getEmbedding"; // ✅ Directly import from lib

/**
 * Load all documents, embed them, and upsert to Pinecone
 */
export const loadEmbeddings = async () => {
  try {
    // ✅ 1. Fetch list of .txt files from your API
    const { data } = await axios.get("/api/documents/getAllTxtFiles");
    const files = data.files;

    if (!Array.isArray(files) || files.length === 0) {
      console.warn("⚠️ No text files found to process.");
      return;
    }

    console.log(`📂 Found ${files.length} files. Processing...`);

    // ✅ 2. Process all files in parallel
    const embedded = await Promise.all(
      files.map(async (file) => {
        try {
          const text = await fetchTextFromFile(file.fullPath);

          // Optional: Chunk text to avoid token limits
          const chunks = chunkText(text, 800); // ~800 tokens each

          // ✅ 3. Generate embeddings for all chunks
          const embeddings = await Promise.all(
            chunks.map(async (chunk, idx) => {
              const embedding = await getEmbedding(chunk); // 🔹 now imported, no API call
              return {
                id: `${file.relativePath}#${idx}`,
                values: embedding,
                metadata: {
                  text: chunk,
                  source: file.relativePath,
                  fileName: file.name,
                  timestamp: new Date().toISOString(),
                },
              };
            })
          );

          return embeddings;
        } catch (err) {
          console.error(`❌ Error processing file ${file.relativePath}:`, err);
          return [];
        }
      })
    );

    // ✅ 4. Flatten nested arrays
    const vectors = embedded.flat();

    if (!Array.isArray(vectors) || vectors.length === 0) {
      console.warn("⚠️ No embeddings generated. Aborting upsert.");
      return;
    }

    console.log(`📦 Prepared ${vectors.length} vectors for upsert.`);

    // ✅ 5. Upsert documents to Pinecone
    const result = await index.upsert({ vectors });
    console.log("✅ Upsert complete:", result);
  } catch (error) {
    console.error("❌ Error loading embeddings:", error);
  }
};

/**
 * Fetch file content from API
 */
const fetchTextFromFile = async (filePath) => {
  try {
    const response = await fetch(`/api/documents/getFileText?filePath=${encodeURIComponent(filePath)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch file content: ${response.statusText}`);
    }
    const data = await response.json();
    return data.text || "";
  } catch (error) {
    console.error(`❌ Error fetching file content for ${filePath}:`, error);
    throw error;
  }
};

/**
 * Utility to split text into chunks
 */
const chunkText = (text, chunkSize = 800) => {
  const words = text.split(" ");
  const chunks = [];
  let currentChunk = [];

  for (const word of words) {
    if (currentChunk.join(" ").length + word.length <= chunkSize) {
      currentChunk.push(word);
    } else {
      chunks.push(currentChunk.join(" "));
      currentChunk = [word];
    }
  }
  if (currentChunk.length) chunks.push(currentChunk.join(" "));
  return chunks;
};
