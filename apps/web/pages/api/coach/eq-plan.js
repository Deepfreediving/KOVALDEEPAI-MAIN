// EQ Plan API - Generate equalization cadence and mouthfill recommendations
// Uses RAG to retrieve Daniel's methodology from knowledge base

import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const index = pinecone.index('koval-deep-ai');

// Query knowledge base for Daniel's EQ and mouthfill methodology
async function getEQKnowledge(query) {
  try {
    // Get embedding for the query
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    // Search Pinecone for relevant knowledge chunks
    const results = await index.query({
      vector: embedding.data[0].embedding,
      topK: 8,
      includeMetadata: true,
      // Remove topic filter since topics are 'unknown' in current data
      // Let semantic similarity find the best chunks
    });

    return results.matches.map(match => match.metadata?.text || '').join('\n\n');
  } catch (error) {
    console.error('Error retrieving EQ knowledge:', error);
    return null;
  }
}

// Generate EQ plan using retrieved knowledge and AI reasoning
async function generateEQPlanWithKnowledge(targetDepth, maxReversePack, experience) {
  const query = `mouthfill depth calculation reverse pack ${targetDepth}m target depth equalization cadence progression ${experience} experience level`;
  
  const knowledge = await getEQKnowledge(query);
  
  if (!knowledge) {
    throw new Error('Unable to retrieve coaching knowledge');
  }

  // Use AI to apply Daniel's methodology from retrieved knowledge
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are Daniel Koval's EQ plan calculator. Use ONLY the provided knowledge to generate precise mouthfill and equalization recommendations.

KNOWLEDGE BASE:
${knowledge}

RULES:
- Follow Daniel's exact methodology from the knowledge
- If reverse pack depth unknown, ask for it with specific test protocol
- Apply safety rules exactly as stated in knowledge
- Use progression rules from knowledge (not assumptions)
- Return structured JSON response only`
      },
      {
        role: 'user',
        content: `Generate EQ plan for:
- Target depth: ${targetDepth}m
- Max reverse pack: ${maxReversePack || 'unknown'}
- Experience: ${experience}

Return JSON with: mouthfillDepth, volumeRecommendation, cadenceBands, totalEQCount, theoreticalMaxDepth, safetyMargin, notes, needsFlexibilityTraining, and any warnings/recommendations.`
      }
    ],
    temperature: 0.1,
    max_tokens: 1500
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error('Invalid response format from AI');
  }
}
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { targetDepth, maxReversePack, userLevel = 'beginner' } = req.body;

    if (!targetDepth || targetDepth <= 0) {
      return res.status(400).json({ error: 'Valid targetDepth required' });
    }

    // Generate EQ plan using RAG knowledge retrieval
    const eqPlan = await generateEQPlanWithKnowledge(targetDepth, maxReversePack, userLevel);

    // Daniel's CLEAR DIVE safety checklist (can be hardcoded as it's standard)
    const clearDiveChecklist = [
      'C - Contractions timing ≥ ⅓ of planned dive time?',
      'L - Legs calm on descent, no early burn?',  
      'E - Equalization smooth and repeatable?',
      'A - Any O₂ symptoms (tunnel vision, stars) absent?',
      'R - Rising doubts or distraction absent?',
      'D - Discomfort in chest/throat absent?',
      'I - Impairment from narcosis absent?',
      'V - Vision clear, no distortion?',
      'E - Equipment fully functional?'
    ];

    res.status(200).json({
      success: true,
      targetDepth,
      eqPlan,
      clearDiveChecklist,
      kovaPhilosophy: {
        quote: "Mouthfill Depth × Relative Volume (1x–5x) = Max Equalization Depth",
        reminder: "If it's not a CLEAR DIVE, don't go DEEP",
        principle: "Perfect technique > maximum depth"
      }
    });

  } catch (error) {
    console.error('EQ Plan API error:', error);
    res.status(500).json({ 
      error: 'Failed to generate EQ plan',
      details: error.message 
    });
  }
}
