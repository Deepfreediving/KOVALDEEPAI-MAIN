import fs from "fs";
import path from "path";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || "" });
const index = pinecone.index(process.env.PINECONE_INDEX || "");

// Helper: Split text into chunks
function chunkText(text: string, maxLength = 500): string[] {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += " " + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}

async function processFile(filePath: string) {
  const fileName = path.basename(filePath);
  const rawText = fs.readFileSync(filePath, "utf-8");
  
  // Enhanced chunking for safety protocols - keep sections together
  const chunks = chunkSafetyDocument(rawText);

  console.log(`📂 Processing: ${fileName} (${chunks.length} chunks)`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embedText(chunk);

    await index.upsert([
      {
        id: `safety_progression_${i}_${Date.now()}`,
        values: embedding,
        metadata: {
          source: fileName,
          chunkIndex: i,
          text: chunk,
          approvedBy: "Daniel Koval",
          category: "safety_protocols",
          priority: "critical",
          topic: detectTopic(chunk),
        },
      },
    ]);
    
    console.log(`✅ Uploaded chunk ${i + 1}/${chunks.length}: ${chunk.substring(0, 60)}...`);
  }
}

// Enhanced chunking for safety documents
function chunkSafetyDocument(text: string): string[] {
  const chunks: string[] = [];
  
  // Split by major sections (marked by ========)
  const sections = text.split(/={10,}/);
  
  for (const section of sections) {
    if (section.trim().length < 50) continue; // Skip tiny sections
    
    const cleanSection = section.trim();
    
    // If section is small enough, keep it as one chunk
    if (cleanSection.length <= 800) {
      chunks.push(cleanSection);
    } else {
      // For larger sections, split by subsections or paragraphs
      const paragraphs = cleanSection.split(/\n\s*\n/);
      let currentChunk = "";
      
      for (const paragraph of paragraphs) {
        if ((currentChunk + paragraph).length > 600 && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = paragraph;
        } else {
          currentChunk += "\n\n" + paragraph;
        }
      }
      
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    }
  }
  
  return chunks.filter(chunk => chunk.length > 20); // Remove very small chunks
}

// Detect topic for better categorization
function detectTopic(text: string): string {
  const lower = text.toLowerCase();
  
  if (lower.includes("depth progression") || lower.includes("90m+")) return "depth_progression";
  if (lower.includes("surface interval")) return "surface_intervals";
  if (lower.includes("e.n.c.l.o.s.e") || lower.includes("enclose")) return "safety_criteria";
  if (lower.includes("dynamic apnea") || lower.includes("dyn")) return "dynamic_training";
  if (lower.includes("static apnea") || lower.includes("sta")) return "static_training";
  if (lower.includes("safety principles")) return "safety_principles";
  if (lower.includes("consolidation")) return "consolidation_rules";
  
  return "general_protocols";
}

async function main() {
  const filePath = path.join(process.cwd(), "data", "Safety", "Freediving_Progression_Protocols.txt");
  
  if (!fs.existsSync(filePath)) {
    console.error("❌ Freediving_Progression_Protocols.txt not found at:", filePath);
    return;
  }

  console.log("🔥 CRITICAL SAFETY UPDATE: Adding Freediving Progression Protocols to Pinecone");
  console.log("📁 File:", filePath);
  
  await processFile(filePath);

  console.log("✅ Freediving Progression Protocols successfully added to Pinecone!");
  console.log("🎯 This will fix the dangerous progression advice issue");
}

main().catch((err) => console.error("❌ Error adding safety protocols:", err));
