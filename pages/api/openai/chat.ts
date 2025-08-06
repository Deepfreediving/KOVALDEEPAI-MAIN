import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import handleCors from '@/utils/handleCors';
import { fetchUserMemory, saveUserMemory } from '@/lib/userMemoryManager';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || '' });
const pinecone = PINECONE_API_KEY ? new Pinecone({ apiKey: PINECONE_API_KEY }) : null;

function detectUserLevel(profile: any): 'expert' | 'beginner' {
  try {
    const pb = parseFloat(profile?.pb || 0);
    return profile?.isInstructor || pb > 80 ? 'expert' : 'beginner';
  } catch {
    return 'beginner';
  }
}

function getDepthRange(depth: number): string {
  if (!depth || depth <= 0) return '10m';
  if (depth > 100) return '100m';
  return `${Math.floor(depth / 10) * 10}m`;
}

async function queryPinecone(query: string): Promise<string[]> {
  if (!query?.trim()) return [];
  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    // ✅ UPDATED: Use new unified pinecone endpoint
    const response = await fetch(`${baseUrl}/api/pinecone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'query',
        query,
        topK: 5,
        filter: { approvedBy: { $eq: 'Koval' } }
      })
    });

    if (!response.ok) {
      console.warn(`⚠️ Pinecone query failed with status ${response.status}`);
      return [];
    }

    const result = await response.json();
    return result.matches?.map((m: any) => m.metadata?.text).filter(Boolean) || [];
  } catch (error: any) {
    console.error('❌ Pinecone error:', error.message);
    return [];
  }
}

async function queryDiveLogs(userId: string): Promise<string[]> {
  if (!userId || userId.startsWith('guest')) return [];
  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/analyze/get-dive-logs?userId=${userId}`);
    if (response.ok) {
      const data = await response.json();
      return data.logs?.slice(0, 5).map((log: any) =>
        `Personal dive: ${log.reachedDepth || log.targetDepth}m ${log.discipline || 'freedive'} at ${log.location || 'unknown'} - ${log.notes || 'no notes'}`
      ) || [];
    }
    return [];
  } catch (err) {
    console.warn('⚠️ Dive log query failed:', err);
    return [];
  }
}

function generateSystemPrompt(level: 'expert' | 'beginner'): string {
  return `You are Koval Deep AI, a freediving coach powered by Daniel Koval's training expertise.

🎯 Guidelines:
- Provide ${level}-level freediving advice based on available knowledge and personal data
- Focus on safety, technique, and progressive training
- Keep responses under 600 words
- Be encouraging and practical

If information is lacking, be honest and provide general safety advice.`;
}

// ✅ FIX: Type userLevel correctly
async function askWithContext(
  contextChunks: string[], 
  message: string, 
  userLevel: 'expert' | 'beginner'  // ✅ Fixed typing
): Promise<string> {
  if (!OPENAI_API_KEY) return "⚠️ OpenAI API is not configured.";

  console.log("🔹 Sending request to OpenAI...");
  const context = contextChunks.length
    ? contextChunks.slice(0, 3).join('\n\n')
    : "No specific knowledge found. Provide general freediving safety advice.";

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 800,
      messages: [
        { role: 'system', content: generateSystemPrompt(userLevel) },
        { role: 'system', content: `Knowledge Base:\n${context}` },
        { role: 'user', content: message }
      ]
    });

    const reply = response?.choices?.[0]?.message?.content?.trim() || "⚠️ No response generated.";
    console.log("✅ OpenAI response received");
    return reply;

  } catch (error: any) {
    console.error('❌ OpenAI API error:', error.message);
    return "⚠️ There was an error reaching OpenAI.";
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();

  try {
    await handleCors(req, res);
    if (req.method === 'OPTIONS') return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { message, userId = 'guest', profile = {}, embedMode = false } = req.body;
    
    // ✅ Enhanced validation
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ 
        error: 'Invalid message',
        assistantMessage: { role: 'assistant', content: 'Please provide a valid message.' }
      });
    }

    console.log(`🚀 Chat request received from userId=${userId}`);

    // ✅ FIX: Type memory correctly
    let memory: any = {};
    try { 
      memory = await fetchUserMemory(userId) || {}; 
    } catch (memError) {
      console.warn('⚠️ Memory fetch failed:', memError);
    }

    const mergedProfile = { ...memory?.profile, ...profile };
    const userLevel = detectUserLevel(mergedProfile);
    const depthRange = getDepthRange(mergedProfile.pb || mergedProfile.currentDepth || 10);

    console.log(`👤 User: ${userLevel} level, ${depthRange} target`);

    const contextChunks = await queryPinecone(message);
    const diveContext = await queryDiveLogs(userId);

    console.log(`📊 Context: ${contextChunks.length} knowledge + ${diveContext.length} dive logs`);

    const assistantReply = await askWithContext([...contextChunks, ...diveContext], message, userLevel);

    // ✅ Save to memory if successful response
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
      } catch (saveError) {
        console.warn('⚠️ Could not save memory:', saveError);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Chat completed in ${processingTime}ms`);

    return res.status(200).json({
      assistantMessage: { role: 'assistant', content: assistantReply },
      metadata: { 
        userLevel, 
        depthRange, 
        contextChunks: contextChunks.length, 
        diveContext: diveContext.length, 
        processingTime, 
        embedMode 
      }
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Fatal chat error:', error);
    
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
    timeout: 30000 
  } 
};
