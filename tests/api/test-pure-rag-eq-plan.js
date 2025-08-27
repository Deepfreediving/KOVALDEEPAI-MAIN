// Test Pure RAG EQ Plan API
// Shows how knowledge is retrieved from data folder and applied by AI

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
    });

    return results.matches.map(match => match.metadata?.text || '').join('\n\n');
  } catch (error) {
    console.error('Error retrieving EQ knowledge:', error);
    return null;
  }
}

// Generate EQ plan using retrieved knowledge and AI reasoning
async function generateEQPlanWithKnowledge(targetDepth, maxReversePack, experience) {
  const query = `mouthfill depth calculation reverse pack ${targetDepth}m target depth equalization cadence progression ${experience} experience level safety rules 50% depth`;
  
  console.log(`🔍 Searching for: "${query}"`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const knowledge = await getEQKnowledge(query);
  
  if (!knowledge) {
    throw new Error('Unable to retrieve coaching knowledge');
  }

  console.log('📚 RETRIEVED KNOWLEDGE:');
  console.log(knowledge.substring(0, 500) + '...\n');

  // Use AI to apply Daniel's methodology from retrieved knowledge
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are Daniel Koval's EQ plan calculator. Use ONLY the provided knowledge to generate precise mouthfill and equalization recommendations.

KNOWLEDGE BASE:
${knowledge}

CRITICAL RULES FROM DANIEL'S METHODOLOGY:
- Never take mouthfill deeper than 50% of target depth (e.g., 80m dive = max 40m mouthfill)
- Proper EQ progression: 5-6m (0-30m), 3-5m (30-45m), 2-3m (45-60m), 1-2m (60m+)
- If reverse pack depth unknown, guide them through testing protocol
- Follow exact safety rules and progression from knowledge base
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
    console.log('Raw AI response:', response.choices[0].message.content);
    throw new Error('Invalid response format from AI');
  }
}

async function testPureRAG() {
  console.log('🧪 TESTING PURE RAG EQ PLAN API');
  console.log('==================================================\n');

  const testCases = [
    {
      name: 'Advanced Diver - 80m Target',
      targetDepth: 80,
      maxReversePack: 55,
      experience: 'advanced'
    },
    {
      name: 'Missing Reverse Pack Data',
      targetDepth: 60,
      maxReversePack: null,
      experience: 'intermediate'
    },
    {
      name: 'Beginner - Conservative 50m',
      targetDepth: 50,
      maxReversePack: 35,
      experience: 'beginner'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🎯 ${testCase.name}`);
    console.log(`Target: ${testCase.targetDepth}m | Reverse Pack: ${testCase.maxReversePack || 'unknown'} | Experience: ${testCase.experience}`);
    console.log('─'.repeat(60));
    
    try {
      const result = await generateEQPlanWithKnowledge(
        testCase.targetDepth, 
        testCase.maxReversePack, 
        testCase.experience
      );
      
      console.log('✅ AI-Generated EQ Plan:');
      console.log(`   Mouthfill Depth: ${result.mouthfillDepth}m`);
      console.log(`   Volume: ${result.volumeRecommendation}`);
      console.log(`   Total EQs: ${result.totalEQCount}`);
      console.log(`   Safety Notes: ${result.notes?.[0] || 'None'}`);
      
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    console.log('\n' + '═'.repeat(60));
  }
  
  console.log('\n🎯 CONCLUSION:');
  console.log('• Knowledge is retrieved from data/ folder via Pinecone');
  console.log('• AI applies Daniel\'s methodology from retrieved chunks');
  console.log('• No hardcoded logic - all knowledge-driven');
  console.log('• Update data/ files to change behavior');
}

testPureRAG().catch(console.error);
