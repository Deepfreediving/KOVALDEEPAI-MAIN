/**
 * 🎯 ENHANCED COACHING ENDPOINT - /api/chat/coaching.js
 * 
 * PURPOSE: Advanced coaching with Daniel Koval's specific methodology
 * FEATURES:
 * - RAG knowledge retrieval with Pinecone
 * - User dive context analysis (recent 10 dives)
 * - CLEAR DIVE & E.N.C.L.O.S.E. frameworks implementation
 * - Certification-level appropriate recommendations (L1/L2/L3)
 * - Pattern analysis (depth trends, issues, mouthfill usage)
 * - Direct coaching style matching Daniel's approach
 * 
 * COMMUNICATION: OpenAI GPT-4o + Pinecone + Supabase
 * USERS: Users requesting specialized coaching interactions
 * 
 * USAGE: When user explicitly requests coaching mode or technical analysis
 */

// Enhanced Chat API with RAG knowledge retrieval and coaching logic
import { getAdminClient } from '../../../lib/supabase/index';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

async function getRelevantKnowledge(query, topK = 5) {
  try {
    const index = pinecone.index(process.env.PINECONE_INDEX);
    
    // Generate embedding for the query
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });

    // Search Pinecone for relevant content
    const searchResults = await index.query({
      vector: queryEmbedding.data[0].embedding,
      topK,
      includeMetadata: true
    });

    return searchResults.matches.map(match => ({
      content: match.metadata?.text || '',
      source: match.metadata?.source || 'Unknown',
      score: match.score
    }));
  } catch (error) {
    console.error('RAG retrieval error:', error);
    return [];
  }
}

async function getUserDiveContext(userId) {
  if (!userId) return null;

  try {
    const supabase = getAdminClient();
    
    // Get recent dive logs
    const { data: recentDives } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!recentDives || recentDives.length === 0) {
      return null;
    }

    // Generate summary of dive patterns
    const totalDives = recentDives.length;
    const avgDepth = recentDives.reduce((sum, dive) => sum + (dive.reached_depth || 0), 0) / totalDives;
    const issueCount = recentDives.filter(dive => dive.squeeze || dive.issue_depth || dive.issue_comment).length;
    const recentMaxDepth = Math.max(...recentDives.map(dive => dive.reached_depth || 0));
    
    // Check for mouthfill usage
    const mouthfillDives = recentDives.filter(dive => dive.mouthfill_depth);
    const avgMouthfillDepth = mouthfillDives.length > 0 ? 
      mouthfillDives.reduce((sum, dive) => sum + dive.mouthfill_depth, 0) / mouthfillDives.length : null;

    return {
      totalDives,
      avgDepth: Math.round(avgDepth),
      recentMaxDepth,
      issueRate: (issueCount / totalDives * 100).toFixed(1),
      avgMouthfillDepth: avgMouthfillDepth ? Math.round(avgMouthfillDepth) : null,
      lastDive: recentDives[0],
      commonIssues: recentDives
        .filter(dive => dive.issue_comment)
        .map(dive => dive.issue_comment)
        .slice(0, 3)
    };
  } catch (error) {
    console.error('Error getting user dive context:', error);
    return null;
  }
}

function buildSystemPrompt(userContext, knowledgeContext) {
  let prompt = `You are Daniel Koval's AI coaching assistant, implementing his exact freediving methodology.

CORE PRINCIPLES:
- Safety-first, evidence-based coaching
- Tier-based progression (L1 → L2 → L3)
- "Less is more" training philosophy
- Direct but supportive communication
- CLEAR DIVE and E.N.C.L.O.S.E. diagnostic frameworks

CERTIFICATION TOOL ACCESS:
- L1: Basic Frenzel, dry statics (max 4:00), relaxation only
- L2: NPDs (shallow), reverse packing, mouthfill introduction, MDR warmups
- L3: Advanced tools, CO2/O2 tables, competition prep

KNOWLEDGE CONTEXT:
${knowledgeContext.map(k => `- ${k.source}: ${k.content.substring(0, 200)}...`).join('\n')}

DIVE PATTERNS:`;

  if (userContext) {
    prompt += `
- Recent dives: ${userContext.totalDives}
- Average depth: ${userContext.avgDepth}m
- Max recent depth: ${userContext.recentMaxDepth}m
- Issue rate: ${userContext.issueRate}%
- Mouthfill depth: ${userContext.avgMouthfillDepth || 'Not used'}m
${userContext.commonIssues.length > 0 ? `- Recent issues: ${userContext.commonIssues.join(', ')}` : ''}`;
  } else {
    prompt += '\n- No dive history available - ask for certification level and experience';
  }

  prompt += `

RESPONSE GUIDELINES:
- Always confirm certification level before recommending tools
- Use CLEAR DIVE checklist for safety assessment
- Route complex issues through E.N.C.L.O.S.E. categories
- Reference specific knowledge sources when relevant
- Maintain Daniel's direct, no-nonsense coaching style
- Ask follow-up questions to understand root causes

Remember: "The most important thing isn't knowing everything — it's learning how to ask the right question."`;

  return prompt;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, userId, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get relevant knowledge from Pinecone
    const knowledgeContext = await getRelevantKnowledge(message, 5);

    // Get user's dive context from Supabase
    const userContext = await getUserDiveContext(userId);

    // Build conversation with context
    const systemPrompt = buildSystemPrompt(userContext, knowledgeContext);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Generate response using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 1000,
      temperature: 0.7
    });

    const response = completion.choices[0].message.content;

    // Include relevant sources for transparency
    const sources = knowledgeContext
      .filter(k => k.score > 0.7) // Only highly relevant sources
      .map(k => k.source);

    res.status(200).json({
      success: true,
      response,
      sources: sources.length > 0 ? sources : null,
      userContext: userContext ? {
        recentDives: userContext.totalDives,
        avgDepth: userContext.avgDepth,
        issueRate: userContext.issueRate
      } : null,
      suggestions: [
        'Ask about specific dive issues',
        'Request EQ plan for target depth',
        'Get ENCLOSE diagnostic for problems',
        'Review CLEAR DIVE safety checklist'
      ]
    });

  } catch (error) {
    console.error('Coach chat API error:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      details: error.message 
    });
  }
}
