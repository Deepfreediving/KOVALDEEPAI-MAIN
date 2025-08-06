import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import handleCors from '@/utils/handleCors';
import getEmbedding from '@/lib/getEmbedding';
import { fetchUserMemory, saveUserMemory } from '@/lib/userMemoryManager';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || '' });
const pinecone = PINECONE_API_KEY ? new Pinecone({ apiKey: PINECONE_API_KEY }) : null;
const index = pinecone && PINECONE_INDEX ? pinecone.index(PINECONE_INDEX) : null;

// ✅ User level detection
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

function getDepthRange(depth: number): string {
  if (!depth || depth <= 0) return '10m';
  if (depth > 100) return '100m';
  return `${Math.floor(depth / 10) * 10}m`;
}

// ✅ Pinecone query
async function queryPinecone(query: string): Promise<string[]> {
  if (!query?.trim()) {
    console.warn("⚠️ Empty query for Pinecone");
    return [];
  }

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

    const response = await fetch(`${baseUrl}/api/pinecone/queryDocuments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        topK: 5,
        filter: { approvedBy: { "$eq": "Koval" } }
      })
    });

    if (!response.ok) {
      console.warn(`⚠️ Pinecone query failed: ${response.status}`);
      return [];
    }

    const result = await response.json();
    const chunks = result.matches
      ?.map((match: any) => match.metadata?.text)
      .filter((text: string) => text && text.length > 10) || [];

    console.log(`✅ Pinecone: Found ${chunks.length} relevant chunks`);
    return chunks;

  } catch (error: any) {
    console.error('❌ Pinecone query error:', error.message);
    return [];
  }
}

// 🌊 Dive log context
async function queryDiveLogs(userId: string, query: string): Promise<string[]> {
  if (!userId || userId.startsWith('guest') || userId.startsWith('wix-guest')) {
    console.warn("⚠️ Guest user - no personal dive logs available");
    return [];
  }

  try {
    console.log(`🌊 Querying dive logs for user: ${userId}`);

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

    const localResponse = await fetch(`${baseUrl}/api/analyze/get-dive-logs?userId=${encodeURIComponent(userId)}`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (localResponse.ok) {
      const localData = await localResponse.json();
      if (localData.logs?.length > 0) {
        const dives = localData.logs.slice(0, 5).map((log: any) =>
          `Personal dive: ${log.reachedDepth || log.targetDepth}m ${log.discipline || 'freedive'} at ${log.location || 'unknown'} - ${log.notes || 'no notes'}`
        );
        return dives;
      }
    }

    // Fallback: Wix backend
    try {
      const wixResponse = await fetch(`https://www.deepfreediving.com/_functions/diveLogs?userId=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (wixResponse.ok) {
        const wixData = await wixResponse.json();
        if (wixData.success && wixData.data) {
          const dives = wixData.data.slice(0, 5).map((log: any) =>
            `Personal dive: ${log.reachedDepth || log.targetDepth}m ${log.discipline || 'freedive'} at ${log.location || 'unknown'} - ${log.notes || 'no notes'}`
          );
          return dives;
        }
      }
    } catch (wixError) {
      console.warn('⚠️ Wix dive logs query failed:', wixError);
    }

    return [];
  } catch (error) {
    console.warn('⚠️ Dive log context query failed:', error);
    return [];
  }
}

function generateSystemPrompt(level: 'expert' | 'beginner'): string {
  return `You are Koval Deep AI, a freediving coach powered by Daniel Koval's training expertise.

🎯 Guidelines:
- Provide ${level}-level freediving advice based on knowledge and user data
- Focus on safety, technique, and progressive training
- Keep responses under 600 words
- Be encouraging and practical

If unsure, say so honestly and offer general safety advice.`;
}

async function askWithContext(
  contextChunks: string[],
  message: string,
  userLevel: 'expert' | 'beginner'
): Promise<string> {

  if (!OPENAI_API_KEY) {
    return "⚠️ OpenAI is not configured. Please check API settings.";
  }

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

    const content = response?.choices?.[0]?.message?.content?.trim();
    return content || "⚠️ No response generated.";
  } catch (error: any) {
    console.error('❌ OpenAI error:', error.message);
    return "⚠️ I'm having trouble responding right now. Please try again.";
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();

  try {
    await handleCors(req, res);
    if (req.method === 'OPTIONS') return;
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method Not Allowed',
        message: 'Only POST requests allowed'
      });
    }

    const { message, userId = 'guest', profile = {}, embedMode = false } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Invalid message' });
    }

    console.log(`🚀 Chat API: user=${userId}, embedMode=${embedMode}`);

    // Load user memory
    let pastMemory: any = {};
    try {
      pastMemory = await fetchUserMemory(userId) || {};
    } catch (error) {
      console.warn('⚠️ Could not load user memory:', error);
    }

    const mergedProfile = { ...pastMemory?.profile, ...profile };
    const userLevel = detectUserLevel(mergedProfile);
    const depthRange = getDepthRange(mergedProfile.pb || mergedProfile.currentDepth || 10);

    const contextChunks = await queryPinecone(message);
    const diveContext = await queryDiveLogs(userId, message);

    const assistantReply = await askWithContext(
      [...contextChunks, ...diveContext],
      message,
      userLevel
    );

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
        diveContext: diveContext.length,
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
        content: "⚠️ I'm having technical difficulties. Please try again shortly."
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
