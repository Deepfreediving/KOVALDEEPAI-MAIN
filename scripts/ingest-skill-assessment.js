#!/usr/bin/env node

/**
 * 🎯 SKILL ASSESSMENT TRAINING DATA - PINECONE INGESTION SCRIPT
 * 
 * This script processes the AI_Skill_Assessment_Training_Data.txt file and
 * chunks it appropriately for Pinecone vector storage with skill-level metadata.
 * 
 * CRITICAL: Each chunk will have metadata indicating:
 * - skill_level: ['basic', 'discover', 'beginner', 'advanced', 'master', 'elite']
 * - content_type: ['certification', 'technique', 'coaching', 'safety', 'progression']
 * - safety_critical: boolean
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');

// Initialize OpenAI and Pinecone clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

async function processSkillAssessmentData() {
  console.log('🚀 Starting Skill Assessment Training Data Processing...');
  
  try {
    // Read the training data file
    const filePath = path.join(__dirname, '../data/experience levels/AI_Skill_Assessment_Training_Data.txt');
    const rawContent = fs.readFileSync(filePath, 'utf8');
    
    console.log('📖 Loaded training data file, processing...');
    
    // Parse and chunk the content
    const chunks = parseAndChunkTrainingData(rawContent);
    console.log(`📊 Generated ${chunks.length} training chunks`);
    
    // Generate embeddings and metadata
    console.log('🧠 Generating embeddings...');
    const processedChunks = await generateEmbeddingsWithMetadata(chunks);
    
    // Ingest into Pinecone
    console.log('☁️ Ingesting into Pinecone...');
    await ingestIntoPinecone(processedChunks);
    
    console.log('✅ Skill assessment data successfully processed and ingested!');
    
  } catch (error) {
    console.error('❌ Error processing skill assessment data:', error);
    throw error;
  }
}

function parseAndChunkTrainingData(content) {
  const chunks = [];
  
  // Split into sections
  const sections = content.split('======================================');
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;
    
    const sectionTitle = extractSectionTitle(section);
    console.log(`📝 Processing section: ${sectionTitle}`);
    
    // Process certification-based assessment section
    if (section.includes('CERTIFICATION-BASED ASSESSMENT')) {
      chunks.push(...processCertificationSection(section));
    }
    
    // Process dive log indicators section
    else if (section.includes('DIVE LOG PERFORMANCE INDICATORS')) {
      chunks.push(...processDiveLogSection(section));
    }
    
    // Process contextual coaching rules section
    else if (section.includes('CONTEXTUAL COACHING RULES')) {
      chunks.push(...processCoachingRulesSection(section));
    }
    
    // Process dive log patterns section
    else if (section.includes('DIVE LOG ANALYSIS PATTERNS')) {
      chunks.push(...processDiveLogPatternsSection(section));
    }
    
    // Process contextual response examples section
    else if (section.includes('CONTEXTUAL RESPONSE EXAMPLES')) {
      chunks.push(...processResponseExamplesSection(section));
    }
    
    // Process recognition confidence factors section
    else if (section.includes('RECOGNITION CONFIDENCE FACTORS')) {
      chunks.push(...processConfidenceSection(section));
    }
    
    // Process special considerations section
    else if (section.includes('SPECIAL CONSIDERATIONS')) {
      chunks.push(...processSpecialConsiderationsSection(section));
    }
  }
  
  return chunks;
}

function processCertificationSection(section) {
  const chunks = [];
  const skillLevels = ['BASIC', 'DISCOVER', 'BEGINNER', 'ADVANCED', 'MASTER', 'ELITE'];
  
  for (const level of skillLevels) {
    const levelRegex = new RegExp(`SKILL LEVEL: ${level}[\\s\\S]*?(?=SKILL LEVEL:|======================================|$)`, 'i');
    const match = section.match(levelRegex);
    
    if (match) {
      const levelContent = match[0];
      
      // Extract certifications
      const certMatch = levelContent.match(/Certifications:([\s\S]*?)(?=Characteristics:|AI Coaching|$)/);
      if (certMatch) {
        chunks.push({
          content: `SKILL LEVEL: ${level} CERTIFICATIONS\\n${certMatch[1].trim()}`,
          metadata: {
            skill_level: level.toLowerCase(),
            content_type: 'certification',
            safety_critical: true,
            section: 'certification_mapping'
          }
        });
      }
      
      // Extract characteristics
      const charMatch = levelContent.match(/Characteristics:([\s\S]*?)(?=Performance Indicators|AI Coaching|$)/);
      if (charMatch) {
        chunks.push({
          content: `${level} SKILL CHARACTERISTICS:\\n${charMatch[1].trim()}`,
          metadata: {
            skill_level: level.toLowerCase(),
            content_type: 'skill_characteristics',
            safety_critical: true,
            section: 'skill_assessment'
          }
        });
      }
      
      // Extract performance indicators
      const perfMatch = levelContent.match(/Performance Indicators from Dive Logs:([\s\S]*?)(?=AI Coaching|$)/);
      if (perfMatch) {
        chunks.push({
          content: `${level} PERFORMANCE INDICATORS:\\n${perfMatch[1].trim()}`,
          metadata: {
            skill_level: level.toLowerCase(),
            content_type: 'performance_indicators',
            safety_critical: false,
            section: 'dive_log_analysis'
          }
        });
      }
      
      // Extract coaching approach
      const coachMatch = levelContent.match(/AI Coaching Approach:([\s\S]*?)(?=SKILL LEVEL:|======================================|$)/);
      if (coachMatch) {
        chunks.push({
          content: `${level} COACHING APPROACH:\\n${coachMatch[1].trim()}`,
          metadata: {
            skill_level: level.toLowerCase(),
            content_type: 'coaching_methodology',
            safety_critical: true,
            section: 'coaching_rules'
          }
        });
      }
    }
  }
  
  return chunks;
}

function processDiveLogSection(section) {
  const chunks = [];
  
  // Depth progression analysis
  const depthMatch = section.match(/DEPTH PROGRESSION ANALYSIS:([\s\S]*?)(?=PROFILE QUALITY|$)/);
  if (depthMatch) {
    chunks.push({
      content: `DEPTH PROGRESSION PATTERNS:\\n${depthMatch[1].trim()}`,
      metadata: {
        skill_level: 'all',
        content_type: 'progression_analysis',
        safety_critical: true,
        section: 'dive_progression'
      }
    });
  }
  
  // Profile quality indicators
  const profileMatch = section.match(/PROFILE QUALITY INDICATORS:([\s\S]*?)(?=SAFETY MARGIN|$)/);
  if (profileMatch) {
    chunks.push({
      content: `DIVE PROFILE QUALITY ASSESSMENT:\\n${profileMatch[1].trim()}`,
      metadata: {
        skill_level: 'all',
        content_type: 'technique_analysis',
        safety_critical: false,
        section: 'profile_analysis'
      }
    });
  }
  
  // Safety margin analysis
  const safetyMatch = section.match(/SAFETY MARGIN ANALYSIS:([\s\S]*?)$/);
  if (safetyMatch) {
    chunks.push({
      content: `SAFETY MARGIN ASSESSMENT:\\n${safetyMatch[1].trim()}`,
      metadata: {
        skill_level: 'all',
        content_type: 'safety_assessment',
        safety_critical: true,
        section: 'safety_analysis'
      }
    });
  }
  
  return chunks;
}

function processCoachingRulesSection(section) {
  const chunks = [];
  
  // Skill recognition triggers
  const triggersMatch = section.match(/SKILL RECOGNITION TRIGGERS:([\s\S]*?)(?=COACHING ADAPTATION|$)/);
  if (triggersMatch) {
    chunks.push({
      content: `SKILL RECOGNITION METHODOLOGY:\\n${triggersMatch[1].trim()}`,
      metadata: {
        skill_level: 'all',
        content_type: 'skill_recognition',
        safety_critical: true,
        section: 'assessment_methodology'
      }
    });
  }
  
  // Coaching adaptation matrix
  const adaptationMatch = section.match(/COACHING ADAPTATION MATRIX:([\s\S]*?)$/);
  if (adaptationMatch) {
    chunks.push({
      content: `COACHING ADAPTATION RULES:\\n${adaptationMatch[1].trim()}`,
      metadata: {
        skill_level: 'all',
        content_type: 'coaching_adaptation',
        safety_critical: true,
        section: 'coaching_methodology'
      }
    });
  }
  
  return chunks;
}

function processDiveLogPatternsSection(section) {
  const chunks = [];
  const patterns = ['BEGINNER', 'ADVANCED', 'ELITE'];
  
  for (const pattern of patterns) {
    const patternRegex = new RegExp(`${pattern} DIVE LOG PATTERNS:[\\s\\S]*?(?=${patterns.find(p => p !== pattern)} DIVE LOG PATTERNS:|======================================|$)`, 'i');
    const match = section.match(patternRegex);
    
    if (match) {
      chunks.push({
        content: `${pattern} DIVE LOG ANALYSIS:\\n${match[0]}`,
        metadata: {
          skill_level: pattern.toLowerCase(),
          content_type: 'dive_log_patterns',
          safety_critical: false,
          section: 'pattern_recognition'
        }
      });
    }
  }
  
  return chunks;
}

function processResponseExamplesSection(section) {
  const chunks = [];
  
  // Extract individual examples
  const examples = section.split(/FOR [A-Z]+ \\d+m DIVE:/);
  
  for (let i = 1; i < examples.length; i++) {
    const example = examples[i].trim();
    const lines = example.split('\\n');
    const response = lines[0];
    
    // Determine skill level from content
    let skillLevel = 'beginner';
    if (example.includes('40m') || example.includes('Advanced')) skillLevel = 'advanced';
    if (example.includes('50-60m') || example.includes('Elite')) skillLevel = 'elite';
    
    chunks.push({
      content: `COACHING RESPONSE EXAMPLE (${skillLevel.toUpperCase()}):\\n${response}`,
      metadata: {
        skill_level: skillLevel,
        content_type: 'coaching_examples',
        safety_critical: false,
        section: 'response_templates'
      }
    });
  }
  
  return chunks;
}

function processConfidenceSection(section) {
  return [{
    content: `SKILL ASSESSMENT CONFIDENCE FACTORS:\\n${section}`,
    metadata: {
      skill_level: 'all',
      content_type: 'confidence_assessment',
      safety_critical: true,
      section: 'quality_assurance'
    }
  }];
}

function processSpecialConsiderationsSection(section) {
  const chunks = [];
  
  // FII Level 3 recognition
  const fiiMatch = section.match(/FII LEVEL 3 RECOGNITION:[\\s\\S]*?(?=INSTRUCTOR CERTIFICATIONS|$)/);
  if (fiiMatch) {
    chunks.push({
      content: `FII LEVEL 3 SPECIAL RECOGNITION:\\n${fiiMatch[0]}`,
      metadata: {
        skill_level: 'elite',
        content_type: 'certification_special',
        safety_critical: true,
        section: 'fii_level_3'
      }
    });
  }
  
  // Instructor certifications
  const instructorMatch = section.match(/INSTRUCTOR CERTIFICATIONS:[\\s\\S]*?(?=COMPETITION EXPERIENCE|$)/);
  if (instructorMatch) {
    chunks.push({
      content: `INSTRUCTOR CERTIFICATION CONSIDERATIONS:\\n${instructorMatch[0]}`,
      metadata: {
        skill_level: 'master',
        content_type: 'instructor_assessment',
        safety_critical: true,
        section: 'instructor_considerations'
      }
    });
  }
  
  // Competition experience
  const competitionMatch = section.match(/COMPETITION EXPERIENCE:[\\s\\S]*?$/);
  if (competitionMatch) {
    chunks.push({
      content: `COMPETITION EXPERIENCE ASSESSMENT:\\n${competitionMatch[0]}`,
      metadata: {
        skill_level: 'elite',
        content_type: 'competition_assessment',
        safety_critical: false,
        section: 'competition_factors'
      }
    });
  }
  
  return chunks;
}

async function generateEmbeddingsWithMetadata(chunks) {
  const processedChunks = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`🧠 Processing chunk ${i + 1}/${chunks.length}: ${chunk.metadata.section}`);
    
    try {
      // Generate embedding
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small", // Match existing model
        input: chunk.content,
      });
      
      const embedding = response.data[0].embedding;
      
      processedChunks.push({
        id: `skill_assessment_${i + 1}_${chunk.metadata.section}_${chunk.metadata.skill_level}`,
        values: embedding,
        metadata: {
          text: chunk.content,
          skill_level: chunk.metadata.skill_level,
          content_type: chunk.metadata.content_type,
          safety_critical: chunk.metadata.safety_critical,
          section: chunk.metadata.section,
          source: 'ai_skill_assessment_training_data',
          created_at: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error(`❌ Error processing chunk ${i + 1}:`, error.message);
    }
  }
  
  return processedChunks;
}

async function ingestIntoPinecone(chunks) {
  try {
    const index = pinecone.index(process.env.PINECONE_INDEX || 'koval-deep-ai');
    
    // Batch upsert in groups of 10 (Pinecone limit)
    const batchSize = 10;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      console.log(`☁️ Upserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);
      
      await index.upsert(batch);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Successfully upserted ${chunks.length} skill assessment chunks to Pinecone`);
    
  } catch (error) {
    console.error('❌ Error ingesting into Pinecone:', error);
    throw error;
  }
}

function extractSectionTitle(section) {
  const lines = section.split('\\n');
  for (const line of lines) {
    if (line.includes('SECTION') && line.includes(':')) {
      return line.trim();
    }
  }
  return 'Unknown Section';
}

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the script
if (require.main === module) {
  processSkillAssessmentData().catch(console.error);
}

module.exports = {
  processSkillAssessmentData,
  parseAndChunkTrainingData,
  generateEmbeddingsWithMetadata,
  ingestIntoPinecone
};
