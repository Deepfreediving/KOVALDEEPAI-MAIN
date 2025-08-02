import axios from "axios";
import index from "./pineconeClient"; // ✅ Make sure you have this Pinecone client set up

/**
 * Load all documents, embed them, and upsert to Pinecone
 */
export const loadDocuments = async () => {
  try {
    // Fetch list of .txt files
    const { data } = await axios.get("/api/getAllTxtFiles");
    const files = data.files;

    if (!Array.isArray(files) || files.length === 0) {
      console.warn("⚠️ No text files found to process.");
      return;
    }

    console.log(`📂 Found ${files.length} files. Processing...`);

    // Process all files in parallel
    const embedded = await Promise.all(
      files.map(async (file) => {
        try {
          const text = await fetchTextFromFile(file.fullPath);

          // Optional: Chunk text to avoid embedding size limits
          const chunks = chunkText(text, 800); // ~800 tokens each

          // Generate embeddings for all chunks
          const embeddings = await Promise.all(
            chunks.map(async (chunk, idx) => {
              const embedding = await getEmbedding(chunk);
              return {
                id: `${file.relativePath}#${idx}`,
                values: embedding,
                metadata: { text: chunk, source: file.relativePath },
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

    // Flatten nested arrays
    const vectors = embedded.flat();

    if (!Array.isArray(vectors) || vectors.length === 0) {
      console.warn("⚠️ No embeddings generated. Aborting upsert.");
      return;
    }

    console.log(`📦 Prepared ${vectors.length} vectors for upsert.`);

    // ✅ Upsert documents to Pinecone
    const result = await index.upsert({ vectors });
    console.log("✅ Upsert complete:", result);
  } catch (error) {
    console.error("❌ Error loading documents:", error);
  }
};

/**
 * Fetch file content from API
 */
const fetchTextFromFile = async (filePath) => {
  try {
    const response = await fetch(`/api/getFileText?filePath=${encodeURIComponent(filePath)}`);
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
 * Get text embeddings via API
 */
const getEmbedding = async (text) => {
  try {
    const response = await axios.post("/api/getEmbedding", { text });
    if (!response.data?.embedding) {
      throw new Error("No embedding returned from API");
    }
    return response.data.embedding;
  } catch (error) {
    console.error("❌ Error getting embedding:", error);
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
