import fs from "fs";
import path from "path";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || "" });
const index = pinecone.index(process.env.PINECONE_INDEX || "");

// Skill assessment and agency level files
const SKILL_ASSESSMENT_FILE = path.join(process.cwd(), "data", "experience levels", "AI_Skill_Assessment_Training_Data.txt");
const AGENCY_LEVELS_FILE = path.join(process.cwd(), "data", "experience levels", "Freediving_Agency_Levels_Guide (1).txt");

// Helper: Split text into meaningful chunks based on skill levels and sections
function chunkSkillAssessmentText(text: string): Array<{content: string, metadata: any}> {
  const chunks: Array<{content: string, metadata: any}> = [];
  
  // Split by sections first
  const sections = text.split(/======================================/);
  
  for (const section of sections) {
    const trimmedSection = section.trim();
    if (!trimmedSection) continue;
    
    // Identify section type
    let sectionType = "general";
    let skillLevel = "all";
    let depthRange = "all";
    
    if (trimmedSection.includes("SKILL LEVEL: BASIC")) {
      sectionType = "skill_level";
      skillLevel = "basic";
      depthRange = "0-5m";
    } else if (trimmedSection.includes("SKILL LEVEL: DISCOVER")) {
      sectionType = "skill_level";
      skillLevel = "discover";
      depthRange = "5-15m";
    } else if (trimmedSection.includes("SKILL LEVEL: BEGINNER")) {
      sectionType = "skill_level";
      skillLevel = "beginner";
      depthRange = "15-20m";
    } else if (trimmedSection.includes("SKILL LEVEL: ADVANCED")) {
      sectionType = "skill_level";
      skillLevel = "advanced";
      depthRange = "20-40m";
    } else if (trimmedSection.includes("SKILL LEVEL: MASTER")) {
      sectionType = "skill_level";
      skillLevel = "master";
      depthRange = "20-40m";
    } else if (trimmedSection.includes("SKILL LEVEL: ELITE")) {
      sectionType = "skill_level";
      skillLevel = "elite";
      depthRange = "40m+";
    } else if (trimmedSection.includes("DIVE LOG PERFORMANCE INDICATORS")) {
      sectionType = "performance_indicators";
    } else if (trimmedSection.includes("CONTEXTUAL COACHING RULES")) {
      sectionType = "coaching_rules";
    } else if (trimmedSection.includes("CONTEXTUAL RESPONSE EXAMPLES")) {
      sectionType = "response_examples";
    } else if (trimmedSection.includes("RECOGNITION CONFIDENCE FACTORS")) {
      sectionType = "confidence_factors";
    } else if (trimmedSection.includes("SPECIAL CONSIDERATIONS")) {
      sectionType = "special_considerations";
    }
    
    // Further split large sections
    if (trimmedSection.length > 800) {
      const subSections = trimmedSection.split(/\n\n(?=[A-Z][A-Z\s]+:|\w+ PATTERN:|\w+ PROFILE:|FOR \w+)/);
      
      for (let i = 0; i < subSections.length; i++) {
        const subSection = subSections[i].trim();
        if (subSection.length < 50) continue;
        
        chunks.push({
          content: subSection,
          metadata: {
            source: "skill_assessment_training",
            section_type: sectionType,
            skill_level: skillLevel,
            depth_range: depthRange,
            sub_section: i,
            approvedBy: "Koval",
            priority: skillLevel === "elite" ? "high" : skillLevel === "advanced" ? "medium" : "normal"
          }
        });
      }
    } else {
      chunks.push({
        content: trimmedSection,
        metadata: {
          source: "skill_assessment_training",
          section_type: sectionType,
          skill_level: skillLevel,
          depth_range: depthRange,
          approvedBy: "Koval",
          priority: skillLevel === "elite" ? "high" : skillLevel === "advanced" ? "medium" : "normal"
        }
      });
    }
  }
  
  return chunks;
}

// Helper: Chunk agency levels guide
function chunkAgencyLevelsText(text: string): Array<{content: string, metadata: any}> {
  const chunks: Array<{content: string, metadata: any}> = [];
  
  // Split by levels
  const levels = text.split(/--------------------------------------/);
  
  for (const level of levels) {
    const trimmedLevel = level.trim();
    if (trimmedLevel.length < 50) continue;
    
    let skillLevel = "general";
    let depthRange = "all";
    
    if (trimmedLevel.includes("LEVEL: BASIC")) {
      skillLevel = "basic";
      depthRange = "0-5m";
    } else if (trimmedLevel.includes("LEVEL: DISCOVER")) {
      skillLevel = "discover";
      depthRange = "5-15m";
    } else if (trimmedLevel.includes("LEVEL: BEGINNER")) {
      skillLevel = "beginner";
      depthRange = "15-20m";
    } else if (trimmedLevel.includes("LEVEL: ADVANCED")) {
      skillLevel = "advanced";
      depthRange = "20-40m";
    } else if (trimmedLevel.includes("LEVEL: MASTER")) {
      skillLevel = "master";
      depthRange = "20-40m";
    } else if (trimmedLevel.includes("LEVEL: Elite")) {
      skillLevel = "elite";
      depthRange = "40m+";
    }
    
    chunks.push({
      content: trimmedLevel,
      metadata: {
        source: "agency_levels_guide",
        skill_level: skillLevel,
        depth_range: depthRange,
        approvedBy: "Koval",
        certification_mapping: true,
        priority: skillLevel === "elite" ? "high" : "medium"
      }
    });
  }
  
  return chunks;
}

async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}

async function processSkillAssessmentFile() {
  if (!fs.existsSync(SKILL_ASSESSMENT_FILE)) {
    console.error("❌ Skill Assessment Training Data file not found");
    return;
  }
  
  const rawText = fs.readFileSync(SKILL_ASSESSMENT_FILE, "utf-8");
  const chunks = chunkSkillAssessmentText(rawText);
  
  console.log(`📚 Processing Skill Assessment Training Data (${chunks.length} chunks)`);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embedText(chunk.content);
    
    await index.upsert([
      {
        id: `skill_assessment_${i}_${Date.now()}`,
        values: embedding,
        metadata: {
          text: chunk.content,
          ...chunk.metadata
        }
      }
    ]);
    
    console.log(`✅ Ingested skill assessment chunk ${i + 1}/${chunks.length} (${chunk.metadata.skill_level})`);
  }
}

async function processAgencyLevelsFile() {
  if (!fs.existsSync(AGENCY_LEVELS_FILE)) {
    console.error("❌ Agency Levels Guide file not found");
    return;
  }
  
  const rawText = fs.readFileSync(AGENCY_LEVELS_FILE, "utf-8");
  const chunks = chunkAgencyLevelsText(rawText);
  
  console.log(`📋 Processing Agency Levels Guide (${chunks.length} chunks)`);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embedText(chunk.content);
    
    await index.upsert([
      {
        id: `agency_levels_${i}_${Date.now()}`,
        values: embedding,
        metadata: {
          text: chunk.content,
          ...chunk.metadata
        }
      }
    ]);
    
    console.log(`✅ Ingested agency levels chunk ${i + 1}/${chunks.length} (${chunk.metadata.skill_level})`);
  }
}

async function testRetrieval() {
  console.log("\n🧪 Testing retrieval accuracy...");
  
  // Test queries
  const testQueries = [
    "What depth should a beginner freediver aim for?",
    "FII Level 3 certification requirements",
    "Elite level dive log patterns and characteristics",
    "Advanced equalization techniques for 30m dives",
    "Competition level training periodization"
  ];
  
  for (const query of testQueries) {
    console.log(`\n🔍 Query: "${query}"`);
    
    const queryEmbedding = await embedText(query);
    const results = await index.query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true
    });
    
    console.log(`📊 Found ${results.matches?.length || 0} matches:`);
    results.matches?.forEach((match, idx) => {
      console.log(`  ${idx + 1}. Score: ${match.score?.toFixed(3)} | Level: ${match.metadata?.skill_level} | Source: ${match.metadata?.source}`);
      console.log(`     Preview: ${(match.metadata?.text as string)?.substring(0, 100)}...`);
    });
  }
}

async function main() {
  console.log("🚀 Starting Skill Assessment & Agency Levels Pinecone Ingestion...\n");
  
  try {
    // Process both files
    await processSkillAssessmentFile();
    await processAgencyLevelsFile();
    
    // Test retrieval
    await testRetrieval();
    
    console.log("\n✅ Skill assessment data ingestion completed successfully!");
    console.log("🎯 KovalAI now has accurate skill level recognition and coaching capabilities");
    
  } catch (error) {
    console.error("❌ Error during ingestion:", error);
  }
}

main();
