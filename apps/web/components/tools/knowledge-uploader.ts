import fs from "fs";
import path from "path";
import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || "" });
const index = pinecone.index(process.env.PINECONE_INDEX || "");

// === CONFIG ===
const DATA_ROOT = path.join(process.cwd(), "data");

// Helper: Recursively scan directory
function scanFiles(dirPath: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dirPath);
  list.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(scanFiles(fullPath));
    } else if (/\.(txt|md|json)$/i.test(file)) {
      results.push(fullPath);
    }
  });
  return results;
}

// Helper: Create embedding
async function createEmbedding(content: string): Promise<number[]> {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: content,
  });
  return embedding.data[0].embedding;
}

// Extract metadata from file path
function extractMetadata(filePath: string) {
  const relativePath = path.relative(DATA_ROOT, filePath);
  const pathParts = relativePath.split(path.sep);
  const folder = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'root';
  const fileName = path.basename(filePath, path.extname(filePath));
  
  // Extract depth if mentioned in filename
  const depthMatch = fileName.match(/(\d{1,3})m/i);
  
  // Determine content type based on folder or filename
  let contentType = 'general';
  if (folder.includes('experience') || folder.includes('level')) {
    contentType = 'skill-assessment';
  } else if (folder.includes('lesson') || folder.includes('training')) {
    contentType = 'training-material';
  } else if (folder.includes('safety')) {
    contentType = 'safety-protocol';
  } else if (folder.includes('technique')) {
    contentType = 'technique-guide';
  }
  
  return {
    folder: folder,
    fileName: fileName,
    fullFileName: path.basename(filePath),
    contentType: contentType,
    depth: depthMatch ? parseInt(depthMatch[1]) : null,
    relativePath: relativePath
  };
}

async function uploadAllDataFiles() {
  console.log("🚀 Starting auto-ingestion of ALL data files...");
  console.log(`📂 Scanning directory: ${DATA_ROOT}`);
  
  const files = scanFiles(DATA_ROOT);
  console.log(`📋 Found ${files.length} files to process`);

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      if (!content.trim()) {
        console.log(`⚠️  Skipping empty file: ${path.basename(file)}`);
        continue;
      }

      const embedding = await createEmbedding(content);
      const metadata = extractMetadata(file);

      await index.upsert([
        {
          id: `${metadata.folder}-${metadata.fileName}-${Date.now()}`,
          values: embedding,
          metadata: {
            text: content,
            source: metadata.folder,
            contentType: metadata.contentType,
            fileName: metadata.fullFileName,
            relativePath: metadata.relativePath,
            ...(metadata.depth !== null && metadata.depth !== undefined
              ? { depth: metadata.depth }
              : {}),
            uploadedAt: new Date().toISOString(),
            approvedBy: "Koval"
          },
        },
      ]);

      console.log(
        `✅ Uploaded: ${metadata.fullFileName} (${metadata.folder}/${metadata.contentType}${metadata.depth ? `, ${metadata.depth}m` : ''})`,
      );
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err: any) {
      console.error(`❌ Failed to upload ${path.basename(file)}:`, err.message);
    }
  }

  console.log("🎉 Auto-ingestion complete!");
}

uploadAllDataFiles();
