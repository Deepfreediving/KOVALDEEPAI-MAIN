// Test the EQ Plan API with RAG knowledge retrieval
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const index = pinecone.index('koval-deep-ai');

// Copy the functions from the API
async function getEQKnowledge(query) {
  try {
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const results = await index.query({
      vector: embedding.data[0].embedding,
      topK: 8,
      includeMetadata: true,
    });

    return results.matches.map(match => match.metadata?.text || '').join('\n\n');
  } catch (error) {
    console.error('Error retrieving EQ knowledge:', error);
    return null;
  }
}

async function generateEQPlanWithKnowledge(targetDepth, maxReversePack, experience) {
  const query = `mouthfill depth calculation reverse pack ${targetDepth}m target depth equalization cadence progression ${experience} experience level`;
  
  const knowledge = await getEQKnowledge(query);
  
  if (!knowledge) {
    throw new Error('Unable to retrieve coaching knowledge');
  }

  console.log('\n📚 RETRIEVED KNOWLEDGE:');
  console.log('=' .repeat(50));
  console.log(knowledge.substring(0, 500) + '...\n');

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

async function testEQPlan() {
  console.log('🧪 TESTING RAG-POWERED EQ PLAN API');
  console.log('===================================');

  const testCases = [
    { name: 'Sarah (60m diver)', targetDepth: 60, maxReversePack: 45, experience: 'intermediate' },
    { name: 'Unknown reverse pack', targetDepth: 70, maxReversePack: null, experience: 'beginner' },
    { name: 'Tom (90m diver)', targetDepth: 90, maxReversePack: 70, experience: 'advanced' }
  ];

  for (const test of testCases) {
    console.log(`\n🔍 Testing: ${test.name}`);
    console.log(`Target: ${test.targetDepth}m, Reverse Pack: ${test.maxReversePack || 'unknown'}, Experience: ${test.experience}`);
    
    try {
      const result = await generateEQPlanWithKnowledge(test.targetDepth, test.maxReversePack, test.experience);
      console.log('✅ Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }
}

testEQPlan();
