import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import handleCors from '@/utils/handleCors';
import { fetchUserMemory, saveUserMemory } from '@/lib/userMemoryManager';

// ✅ Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ✅ Types
interface UserProfile {
  pb?: number;
  isInstructor?: boolean;
  [key: string]: any;
}

interface UserMemory {
  profile?: UserProfile;
  logs?: Array<{
    userMessage: string;
    assistantReply: string;
    timestamp: string;
  }>;
}

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// ✅ Detect user experience level
function detectUserLevel(profile: UserProfile = {}): 'expert' | 'beginner' {
  const pb = Number(profile.pb) || 0;
  const isInstructor = Boolean(profile.isInstructor);
  return isInstructor || pb > 80 ? 'expert' : 'beginner';
}

// ✅ Simple depth range
function getDepthRange(depth: number = 10): string {
  if (!depth || depth <= 0) return '10m';
  if (depth > 100) return '100m+';
  return `${Math.floor(depth / 10) * 10}m`;
}

// ✅ Pinecone query (updated to use new unified endpoint)
async function queryPinecone(query: string): Promise<string[]> {
  if (!query?.trim()) return [];

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

    // ✅ UPDATED: Use new unified pinecone endpoint
    const response = await fetch(`${baseUrl}/api/pinecone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'query',
        query,
        topK: 5,
        filter: { approvedBy: { $eq: 'Koval' } },
      }),
    });

    if (!response.ok) {
      console.warn(`⚠️ Pinecone query failed with status ${response.status}`);
      return [];
    }

    const result = await response.json();
    return result.matches?.map((m: any) => m.metadata?.text).filter(Boolean) || [];
  } catch (err: unknown) {
    console.warn('⚠️ Pinecone query error:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ✅ System prompt generator
function generateSystemPrompt(level: 'expert' | 'beginner', contextChunks: string[]): string {
  return `
You are Koval Deep AI, a freediving coach powered by Daniel Koval's training expertise.

🎯 Guidelines:
- Provide ${level}-level freediving advice
- Focus on safety, technique, and progressive training
- Keep responses under 600 words
- Be encouraging, supportive, and practical

📚 Relevant Knowledge:
${contextChunks.length ? contextChunks.join('\n') : 'No additional context found.'}
  `.trim();
}

// ✅ API Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await handleCors(req, res);
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { message, userId = 'guest', profile = {} } = req.body as {
      message: string;
      userId?: string;
      profile?: UserProfile;
    };

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Invalid message' });
    }

    // ✅ Load past memory
    let pastMemory: UserMemory = {};
    try {
      pastMemory = ((await fetchUserMemory(userId)) as UserMemory) || {};
    } catch (err: unknown) {
      console.warn('⚠️ Failed to fetch past memory:', err instanceof Error ? err.message : String(err));
    }

    const mergedProfile: UserProfile = { ...pastMemory.profile, ...profile };
    const userLevel = detectUserLevel(mergedProfile);
    const depthRange = getDepthRange(mergedProfile.pb || 10);

    // ✅ Query Pinecone for relevant context
    const contextChunks = await queryPinecone(message);

    // ✅ Messages payload
    const messagesPayload: ChatMessage[] = [
      { role: 'system', content: generateSystemPrompt(userLevel, contextChunks) },
      { role: 'user', content: message },
    ];

    // ✅ Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 800,
      messages: messagesPayload,
    });

    const assistantReply =
      response?.choices?.[0]?.message?.content?.trim() || '⚠️ No response generated.';

    // ✅ Save conversation
    try {
      await saveUserMemory(userId, {
        logs: [
          ...(pastMemory.logs || []),
          { userMessage: message, assistantReply, timestamp: new Date().toISOString() },
        ],
        profile: mergedProfile,
      });
    } catch (err: unknown) {
      console.warn('⚠️ Failed to save user memory:', err instanceof Error ? err.message : String(err));
    }

    return res.status(200).json({
      assistantMessage: { role: 'assistant', content: assistantReply },
      metadata: {
        userLevel,
        depthRange,
        contextChunks: contextChunks.length,
        memoryUsed: Boolean(pastMemory.logs?.length),
      },
    });
  } catch (error: unknown) {
    console.error('Chat API Error:', error instanceof Error ? error.message : String(error));
    return res.status(500).json({
      assistantMessage: {
        role: 'assistant',
        content: '⚠️ Server error: Unable to process your message right now.',
      },
      metadata: { error: true },
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '2mb' },
    responseLimit: '2mb',
    timeout: 30000,
  },
};
