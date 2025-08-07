import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import handleCors from '@/utils/handleCors';
import { fetchUserMemory, saveUserMemory } from '@/lib/userMemoryManager';
import { queryPineconeForChunks } from '@/lib/pineconeQuery';

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

// ✅ Pinecone query (get raw knowledge chunks) - Direct function call
async function queryPinecone(query: string): Promise<string[]> {
  if (!query?.trim()) return [];

  try {
    const chunks = await queryPineconeForChunks(query);
    console.log(`✅ Pinecone returned ${chunks.length} knowledge chunks for query: "${query}"`);
    return chunks;
  } catch (err: unknown) {
    console.warn('⚠️ Pinecone query error (continuing without knowledge):', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ✅ System prompt generator - Enhanced with dive log context
function generateSystemPrompt(level: 'expert' | 'beginner', contextChunks: string[], diveLogContext: string = ''): string {
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
- When dive logs are available, reference them for personalized coaching

🚫 FORBIDDEN:
- Making up training protocols not in the knowledge base
- Combining different methodologies
- Providing generic freediving advice when Daniel's specific approach exists
- Recommending techniques beyond the user's certification level

📚 DANIEL KOVAL'S KNOWLEDGE BASE:
${knowledgeContext || 'No specific knowledge found for this query. Provide only general safety reminders and suggest consulting the full training materials.'}

${diveLogContext}

Based ONLY on the above knowledge and dive history, provide helpful, accurate guidance. If unsure, be honest about limitations.
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

    // ✅ Load past memory AND dive logs for comprehensive coaching context
    let pastMemory: UserMemory = {};
    let diveLogContext = '';
    try {
      pastMemory = ((await fetchUserMemory(userId)) as UserMemory) || {};
      
      // 🏊‍♂️ ENHANCED: Load dive logs directly from local storage first
      console.log(`🔍 Loading dive logs for user: ${userId}`);
      
      try {
        const diveLogsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze/get-dive-logs?userId=${userId}`);
        
        if (diveLogsResponse.ok) {
          const diveLogsData = await diveLogsResponse.json();
          const recentDiveLogs = diveLogsData.logs
            ?.slice(-5) // Last 5 dive logs
            ?.map((log: any) => {
              const details = [
                `📅 ${log.date || 'Unknown date'}`,
                `🏊‍♂️ ${log.discipline || log.disciplineType || 'Unknown discipline'}`,
                `📍 ${log.location || 'Unknown location'}`,
                `🎯 Target: ${log.targetDepth}m → Reached: ${log.reachedDepth}m`,
                log.mouthfillDepth ? `💨 Mouthfill: ${log.mouthfillDepth}m` : '',
                log.issueDepth ? `⚠️ Issue at: ${log.issueDepth}m` : '',
                log.issueComment ? `💭 Issue: ${log.issueComment}` : '',
                log.notes ? `📝 ${log.notes}` : ''
              ].filter(Boolean).join(' | ');
              
              return details;
            })
            ?.join('\n');
            
          if (recentDiveLogs) {
            diveLogContext = `\n\n🏊‍♂️ YOUR RECENT DIVE LOGS:\n${recentDiveLogs}`;
            console.log(`✅ Loaded ${diveLogsData.logs?.length || 0} dive logs for coaching context`);
          } else {
            console.log('📝 No dive logs found, checking memory system...');
          }
        }
      } catch (diveLogError) {
        console.warn('⚠️ Failed to load dive logs from API:', diveLogError);
      }
      
      // 🧠 Fallback: Load from memory system if no direct dive logs
      if (!diveLogContext) {
        const memoryResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze/read-memory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        
        if (memoryResponse.ok) {
          const memoryData = await memoryResponse.json();
          const recentDiveLogs = memoryData.memory
            ?.filter((entry: any) => entry.type === 'dive-log' || entry.disciplineType)
            ?.slice(-3) // Last 3 dive logs from memory
            ?.map((log: any) => `Date: ${log.date}, Discipline: ${log.discipline}, Reached: ${log.reachedDepth}m, Target: ${log.targetDepth}m, Notes: ${log.notes || 'None'}`)
            ?.join('\n');
            
          if (recentDiveLogs) {
            diveLogContext = `\n\n📊 RECENT DIVE HISTORY (from memory):\n${recentDiveLogs}`;
            console.log(`✅ Loaded ${memoryData.memory?.length || 0} memory entries including recent dive logs`);
          }
        }
      }
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
      { role: 'system', content: generateSystemPrompt(userLevel, contextChunks, diveLogContext) },
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
