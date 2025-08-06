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
  return isInstructor || pb >= 80 ? 'expert' : 'beginner';
}

// ✅ Simple depth range
function getDepthRange(depth: number = 10): string {
  if (!depth || depth <= 0) return '10m';
  if (depth > 100) return '100m+';
  return `${Math.floor(depth / 10) * 10}m`;
}

// ✅ Pinecone query (get raw knowledge chunks)
async function queryPinecone(query: string): Promise<string[]> {
  if (!query?.trim()) return [];

  try {
    // ✅ Check if Pinecone is configured
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
      console.warn('⚠️ Pinecone not configured, skipping knowledge lookup');
      return [];
    }

    // ✅ Use the pineconequery-gpt endpoint to retrieve raw knowledge chunks
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NODE_ENV === 'production' 
        ? 'https://kovaldeepai-main.vercel.app' 
        : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/pinecone/pineconequery-gpt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, returnChunks: true }),
    });

    if (!response.ok) {
      console.warn(`⚠️ Pinecone chunks query failed with status ${response.status}`);
      return [];
    }

    const result = await response.json();
    const chunks = result.chunks || [];
    
    console.log(`✅ Pinecone returned ${chunks.length} knowledge chunks for query: "${query}"`);
    return chunks;
      
  } catch (err: unknown) {
    console.warn('⚠️ Pinecone query error (continuing without knowledge):', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ✅ System prompt generator
function generateSystemPrompt(level: 'expert' | 'beginner', contextChunks: string[]): string {
  const knowledgeContext = contextChunks.length ? contextChunks.join('\n\n---\n\n') : '';
  
  return `
You are Koval Deep AI, Daniel Koval's freediving coaching system. You must provide accurate, trustworthy advice based STRICTLY on Daniel Koval's methodology.

🎯 CRITICAL REQUIREMENTS:
- ONLY use information from the provided knowledge base below
- If the knowledge base doesn't contain specific information, say "I don't have specific guidance on this in my training materials"
- Never mix general freediving advice with Daniel's specific methods
- Provide ${level}-level technical detail appropriate for the user's experience
- Always prioritize safety and progressive training
- Keep responses detailed but focused (under 800 words)

🚫 FORBIDDEN:
- Making up training protocols not in the knowledge base
- Combining different methodologies
- Providing generic freediving advice when Daniel's specific approach exists
- Recommending techniques beyond the user's certification level

📚 DANIEL KOVAL'S KNOWLEDGE BASE:
${knowledgeContext || 'No specific knowledge found for this query. Provide only general safety reminders and suggest consulting the full training materials.'}

Based ONLY on the above knowledge, provide helpful, accurate guidance. If unsure, be honest about limitations.
  `.trim();
}

// ✅ API Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await handleCors(req, res);
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // ✅ Check OpenAI API key
    if (!OPENAI_API_KEY) {
      console.error('❌ Missing OpenAI API key');
      return res.status(500).json({
        assistantMessage: {
          role: 'assistant',
          content: '⚠️ Configuration error: OpenAI API key not found.',
        },
        metadata: { error: 'missing_api_key' },
      });
    }

    const { message, userId = 'guest', profile = {} } = req.body as {
      message: string;
      userId?: string;
      profile?: UserProfile;
    };

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Invalid message' });
    }

    console.log(`💬 Processing message from ${userId}: "${message.substring(0, 50)}..."`);

    // ✅ Load past memory (safe)
    let pastMemory: UserMemory = {};
    try {
      pastMemory = ((await fetchUserMemory(userId)) as UserMemory) || {};
    } catch (err: unknown) {
      console.warn('⚠️ Failed to fetch past memory (continuing):', err instanceof Error ? err.message : String(err));
    }

    const mergedProfile: UserProfile = { ...pastMemory.profile, ...profile };
    const userLevel = detectUserLevel(mergedProfile);
    const depthRange = getDepthRange(mergedProfile.pb || 10);

    // ✅ Query Pinecone for relevant context (safe)
    let contextChunks: string[] = [];
    try {
      contextChunks = await queryPinecone(message);
    } catch (err: unknown) {
      console.warn('⚠️ Knowledge lookup failed (continuing without):', err instanceof Error ? err.message : String(err));
    }

    // ✅ Messages payload
    const messagesPayload: ChatMessage[] = [
      { role: 'system', content: generateSystemPrompt(userLevel, contextChunks) },
      { role: 'user', content: message },
    ];

    console.log(`🤖 Calling OpenAI with ${userLevel} profile and ${contextChunks.length} knowledge chunks`);

    // ✅ Call OpenAI (with detailed error handling)
    let response;
    try {
      response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 1200,
        messages: messagesPayload,
      });
    } catch (openaiError: unknown) {
      console.error('❌ OpenAI API Error:', openaiError instanceof Error ? openaiError.message : String(openaiError));
      return res.status(500).json({
        assistantMessage: {
          role: 'assistant',
          content: '⚠️ I\'m having trouble connecting to my AI brain right now. Please try again in a moment.',
        },
        metadata: { error: 'openai_api_error' },
      });
    }

    const assistantReply =
      response?.choices?.[0]?.message?.content?.trim() || '⚠️ No response generated.';

    console.log(`✅ Generated response: "${assistantReply.substring(0, 50)}..."`);

    // ✅ Save conversation (safe)
    try {
      await saveUserMemory(userId, {
        logs: [
          ...(pastMemory.logs || []),
          { userMessage: message, assistantReply, timestamp: new Date().toISOString() },
        ],
        profile: mergedProfile,
      });
    } catch (err: unknown) {
      console.warn('⚠️ Failed to save user memory (response still sent):', err instanceof Error ? err.message : String(err));
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
    console.error('💥 Unexpected Chat API Error:', error instanceof Error ? error.message : String(error));
    return res.status(500).json({
      assistantMessage: {
        role: 'assistant',
        content: '⚠️ Something unexpected happened. Please try again.',
      },
      metadata: { error: 'unexpected_error' },
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
