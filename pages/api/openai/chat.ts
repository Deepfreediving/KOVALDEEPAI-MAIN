import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import handleCors from '@/utils/handleCors'; // ✅ CHANGED from cors to handleCors
import getEmbedding from '@/lib/getEmbedding';
import { fetchUserMemory, saveUserMemory } from '@/lib/userMemoryManager';

// ✅ Environment validation
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not configured');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || '' });
const pinecone = PINECONE_API_KEY ? new Pinecone({ apiKey: PINECONE_API_KEY }) : null;
const index = pinecone && PINECONE_INDEX ? pinecone.index(PINECONE_INDEX) : null;

// ✅ Simple user level detection
function detectUserLevel(profile: any): 'expert' | 'beginner' {
  try {
    const pb = parseFloat(profile?.pb || 0);
    const isInstructor = Boolean(profile?.isInstructor);
    
    if (isInstructor || pb > 80) return 'expert';
    return 'beginner';
  } catch {
    return 'beginner';
  }
}

// ✅ Simple depth range
function getDepthRange(depth: number): string {
  if (!depth || depth <= 0) return '10m';
  if (depth > 100) return '100m';
  return `${Math.floor(depth / 10) * 10}m`;
}

// ✅ Simplified Pinecone query
async function queryPinecone(query: string): Promise<string[]> {
  if (!index || !query?.trim()) {
    console.warn("⚠️ Pinecone not available or empty query");
    return [];
  }

  try {
    const vector = await getEmbedding(query);
    if (!vector?.length) return [];

    const result = await index.query({
      vector,
      topK: 5,
      includeMetadata: true,
      filter: { approvedBy: { "$eq": "Koval" } }
    });

    const chunks = result?.matches
      ?.map((m: any) => m.metadata?.text)
      .filter((text: string) => text && text.length > 10) || [];

    console.log(`✅ Found ${chunks.length} relevant chunks`);
    return chunks;

  } catch (error: any) {
    console.error('❌ Pinecone query failed:', error.message);
    return [];
  }
}

// ✅ Simple system prompt
function generateSystemPrompt(level: 'expert' | 'beginner'): string {
  return `You are Koval Deep AI, a freediving coach powered by Daniel Koval's training expertise.

🎯 Guidelines:
- Provide ${level}-level freediving advice based on the knowledge provided
- Focus on safety, technique, and progressive training
- Keep responses under 600 words
- Be encouraging and practical

If you don't have specific information, say so honestly and offer general safety advice.`;
}

// ✅ Simplified OpenAI request
async function askWithContext(
  contextChunks: string[], 
  message: string, 
  userLevel: 'expert' | 'beginner'
): Promise<string> {
  
  if (!OPENAI_API_KEY) {
    return "⚠️ OpenAI is not configured. Please check the API settings.";
  }

  const context = contextChunks.length
    ? contextChunks.slice(0, 3).join('\n\n')
    : "No specific knowledge found. Provide general freediving safety advice.";

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // ✅ Use faster, cheaper model
      temperature: 0.7,
      max_tokens: 800,
      messages: [
        { role: 'system', content: generateSystemPrompt(userLevel) },
        { role: 'system', content: `Knowledge Base:\n${context}` },
        { role: 'user', content: message }
      ]
    });

    const content = response?.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return content;

  } catch (error: any) {
    console.error('❌ OpenAI error:', error.message);
    
    if (error.status === 401) {
      return "⚠️ Authentication error. Please check API configuration.";
    }
    if (error.status === 429) {
      return "⚠️ Too many requests. Please wait a moment and try again.";
    }
    
    return "⚠️ I'm having trouble responding right now. Please try again.";
  }
}

// ✅ Main handler - simplified
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();

  try {
    // ✅ UPDATED: Use handleCors.js (now returns Promise)
    await handleCors(req, res);
    
    if (req.method === 'OPTIONS') return; // Early exit for preflight

    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method Not Allowed',
        message: 'Only POST requests allowed'
      });
    }

    // ✅ Extract and validate input
    const { 
      message, 
      userId = 'guest', 
      profile = {}, 
      embedMode = false 
    } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ 
        error: 'Invalid message',
        message: 'Message is required and must be a non-empty string'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({ 
        error: 'Message too long',
        message: 'Maximum 2000 characters allowed'
      });
    }

    console.log(`🚀 Processing chat for user: ${userId}`);

    // ✅ Load user memory (with fallback)
    let pastMemory: any = {};
    try {
      pastMemory = await fetchUserMemory(userId) || {};
    } catch (error) {
      console.warn('⚠️ Could not load user memory:', error);
    }

    // ✅ Merge profiles
    const mergedProfile = { ...pastMemory?.profile, ...profile };
    const userLevel = detectUserLevel(mergedProfile);
    const depthRange = getDepthRange(mergedProfile.pb || mergedProfile.currentDepth || 10);

    console.log(`👤 User: ${userLevel} level, ${depthRange} target`);

    // ✅ Query knowledge base
    const contextChunks = await queryPinecone(message);

    // ✅ Generate response
    const assistantReply = await askWithContext(contextChunks, message, userLevel);

    // ✅ Save to memory (if not error response)
    if (!assistantReply.startsWith("⚠️")) {
      try {
        await saveUserMemory(userId, {
          logs: [{ 
            userMessage: message.slice(0, 500),
            assistantReply: assistantReply.slice(0, 1000),
            timestamp: new Date().toISOString()
          }],
          profile: mergedProfile
        });
        console.log(`✅ Memory saved for ${userId}`);
      } catch (error) {
        console.warn('⚠️ Memory save failed:', error);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Chat completed in ${processingTime}ms`);

    return res.status(200).json({
      assistantMessage: { 
        role: 'assistant', 
        content: assistantReply 
      },
      metadata: { 
        userLevel, 
        depthRange, 
        contextChunks: contextChunks.length,
        processingTime,
        embedMode
      }
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Fatal error in chat API:', error);
    
    return res.status(500).json({
      assistantMessage: { 
        role: 'assistant', 
        content: "⚠️ I'm having technical difficulties. Please try again in a moment." 
      },
      metadata: { 
        error: true, 
        processingTime,
        errorType: error.name || 'UnknownError'
      }
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '2mb' },
    responseLimit: false,
    timeout: 30000 // 30 seconds
  }
};
