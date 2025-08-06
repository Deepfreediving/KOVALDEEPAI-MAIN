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
const index = pinecone && PINECONE_INDEX ? pinecone.index(PINECONE_INDEX) : null;

// ✅ User level detection
function detectUserLevel(profile: any): 'expert' | 'beginner' {
  try {
    const pb = parseFloat(profile?.pb || 0);
    const isInstructor = Boolean(profile?.isInstructor);
    return (isInstructor || pb > 80) ? 'expert' : 'beginner';
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

// ✅ Pinecone query
async function queryPinecone(query: string): Promise<string[]> {
  if (!query?.trim()) return [];

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

    const response = await fetch(`${baseUrl}/api/pinecone/queryDocuments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK: 5, filter: { approvedBy: { "$eq": "Koval" } } })
    });

    if (!response.ok) return [];

    const result = await response.json();
    return result.matches?.map((m: any) => m.metadata?.text).filter((t: string) => t) || [];
  } catch {
    return [];
  }
}

// ✅ System prompt
function generateSystemPrompt(level: 'expert' | 'beginner'): string {
  return `You are Koval Deep AI, a freediving coach powered by Daniel Koval's training expertise.

🎯 Guidelines:
- Provide ${level}-level freediving advice based on provided knowledge
- Focus on safety, technique, and progressive training
- Keep responses under 600 words
- Be encouraging and practical`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await handleCors(req, res);
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { message, userId = 'guest', profile = {} } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Invalid message' });

    interface PastMemory {
      profile?: Record<string, any>;
    }

    let pastMemory: PastMemory = {};
    try {
      pastMemory = (await fetchUserMemory(userId) || {}) as PastMemory;
    } catch {}

    const mergedProfile = { ...pastMemory?.profile, ...profile };
    const userLevel = detectUserLevel(mergedProfile);
    const depthRange = getDepthRange(mergedProfile.pb || 10);

    const contextChunks = await queryPinecone(message);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 800,
      messages: [
        { role: 'system', content: generateSystemPrompt(userLevel) },
        { role: 'system', content: `Knowledge Base:\n${contextChunks.join("\n")}` },
        { role: 'user', content: message }
      ]
    });

    const assistantReply = response?.choices?.[0]?.message?.content?.trim() || "⚠️ No response generated.";

    await saveUserMemory(userId, {
      logs: [{ userMessage: message, assistantReply, timestamp: new Date().toISOString() }],
      profile: mergedProfile
    });

    return res.status(200).json({
      assistantMessage: { role: 'assistant', content: assistantReply },
      metadata: { userLevel, depthRange, contextChunks: contextChunks.length }
    });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return res.status(500).json({ assistantMessage: { role: 'assistant', content: '⚠️ Server error' } });
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '2mb' }, timeout: 30000 }
};
