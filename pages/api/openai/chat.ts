import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import handleCors from '@/utils/cors';
import { getNextEQQuestion, evaluateEQAnswers } from '@/lib/coaching/eqEngine';
import getEmbedding from '@/lib/getEmbedding';
import { fetchUserMemory, saveUserMemory } from '@/lib/userMemoryManager';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });
const index = process.env.PINECONE_INDEX ? pinecone.index(process.env.PINECONE_INDEX) : null;

function detectUserLevel(profile: any): 'expert' | 'beginner' {
  const pb = profile?.pb || profile?.personalBestDepth;
  const certLevel = profile?.certLevel || '';
  const isInstructor = profile?.isInstructor;
  const numericPB = typeof pb === 'string' ? parseFloat(pb.replace(/[^\d.]/g, '')) : pb;

  if (numericPB && numericPB >= 80) return 'expert';
  if (isInstructor || certLevel.toLowerCase().includes('instructor')) return 'expert';
  return 'beginner';
}

function getDepthRange(depth: number): string {
  if (!depth || isNaN(depth)) return '10m';
  const rounded = Math.floor(depth / 10) * 10;
  return `${rounded}m`;
}

async function queryPinecone(query: string, depthRange: string): Promise<string[]> {
  if (!index) {
    console.warn("⚠️ Pinecone index not initialized.");
    return [];
  }
  try {
    const vector = await getEmbedding(query);
    if (!Array.isArray(vector) || vector.length === 0) return [];

    const result: any = await index.query({
      vector,
      topK: 8,
      includeMetadata: true,
      filter: { approvedBy: 'Koval', depthRange: { $in: [depthRange, 'all'] } },
    });

    return result?.matches
      ?.map((m: any) => m.metadata?.text)
      .filter((t: string): t is string => typeof t === 'string' && t.length > 15) || [];
  } catch (err) {
    console.error('Pinecone query error:', err);
    return [];
  }
}

function generateSystemPrompt(level: 'expert' | 'beginner', depthRange: string): string {
  return `
You are **Koval Deep AI**, a specialized freediving coach assistant created by world-record freediver Daniel Koval.

### 🎯 Rules:
- Provide expert-level coaching advice for deep freediving.
- Analyze diver context first.
- Always prioritize safety and progressive training.
- Avoid filler or vague advice.

### ✅ Response Structure:
1️⃣ Physics & Physiology at ${depthRange}  
2️⃣ Technical Analysis  
3️⃣ Targeted Training Plan  
4️⃣ Safety & Strategy  
5️⃣ Motivator Hook
`;
}

async function askWithContext(contextChunks: string[], message: string, userLevel: 'expert' | 'beginner', depthRange: string) {
  const context = contextChunks.slice(0, 4).join('\n\n');
  const systemPrompt = generateSystemPrompt(userLevel, depthRange);

  const response: any = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.4,
    max_tokens: 1200,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Relevant Koval knowledge:\n${context}\n\nUser input:\n${message}` },
    ],
  });

  return response?.choices?.[0]?.message?.content?.trim() || '⚠️ No response generated.';
}

async function extractProfileFields(message: string) {
  try {
    const result: any = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        { role: 'system', content: 'You are a precise information extractor for freediving profiles.' },
        { role: 'user', content: `Extract freediving profile info from this message.\nReturn JSON with keys: pb (number), certLevel, focus, isInstructor (boolean), discipline, currentDepth (number).\n\n${message}` },
      ],
    });

    let extracted = {};
    try {
      extracted = JSON.parse(result.choices[0].message.content || '{}');
    } catch (e) {
      console.warn("Profile extraction parsing failed:", e);
    }
    return extracted;
  } catch (err) {
    console.error("Profile extraction error:", err);
    return {};
  }
}

async function saveConversationToMemory(userId: string, message: string, assistantReply: string, profile: any, eqState: any, sessionId?: string, sessionName?: string) {
  try {
    await saveUserMemory(userId, {
      logs: [{ userMessage: message, assistantReply, timestamp: new Date().toISOString() }],
      profile,
      eqState,
      sessionId,
      sessionName,
    });
  } catch (err: any) {
    console.warn('⚠️ Failed to save user memory:', err.message);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (await handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { message, userId = 'guest', profile = {}, eqState, diveLogs = [], uploadOnly, sessionId, sessionName } = req.body;

    if (!message && uploadOnly) {
      return res.status(200).json({
        assistantMessage: { role: 'assistant', content: '✅ Dive images uploaded. I’ll analyze them when relevant!' },
        metadata: { sessionType: 'upload-only' },
      });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message must be a non-empty string.' });
    }

    // Load memory
    const pastMemory = await fetchUserMemory(userId);

    // Merge profile
    let mergedProfile = { ...pastMemory?.profile, ...profile };
    try {
      const extractedProfile = await extractProfileFields(message);
      mergedProfile = { ...mergedProfile, ...Object.fromEntries(Object.entries(extractedProfile).filter(([_, v]) => v !== undefined && v !== null && v !== '')) };
    } catch (err) {
      console.warn("Profile extraction skipped due to error:", err);
    }

    const logDepth = diveLogs?.length ? parseFloat(diveLogs[diveLogs.length - 1]?.reachedDepth || 0) : undefined;
    const depthRange = getDepthRange(mergedProfile.currentDepth || mergedProfile.pb || logDepth || 10);
    const userLevel = detectUserLevel(mergedProfile);

    // EQ follow-up
    if (eqState?.currentDepth) {
      try {
        const followup = getNextEQQuestion(eqState);
        if (followup.type === 'question') {
          return res.status(200).json({ type: 'eq-followup', key: followup.key, question: followup.question });
        } else if (followup.type === 'diagnosis-ready') {
          const result = evaluateEQAnswers(eqState.answers);
          return res.status(200).json({ type: 'eq-diagnosis', label: result.label, drills: result.drills });
        }
      } catch (err) {
        console.warn("EQ follow-up failed:", err);
      }
    }

    // Build user context with dive log
    let userContext = message;
    if (diveLogs?.length) {
      const lastLog = diveLogs[diveLogs.length - 1];
      userContext += `\n\nHere is my most recent dive log: ${JSON.stringify(lastLog)}. Evaluate this dive and help me progress safely toward ${mergedProfile.targetDepth || 120}m.`;
    }

    // Query Pinecone
    let contextChunks: string[] = [];
    try {
      contextChunks = await queryPinecone(userContext, depthRange);
    } catch (err) {
      console.warn("Pinecone query failed:", err);
    }

    // Ask AI
    let assistantReply = "⚠️ I'm having trouble responding right now, but I'm still online and will try again soon.";
    try {
      assistantReply = await askWithContext(contextChunks, userContext, userLevel, depthRange);
    } catch (err) {
      console.error("OpenAI main call failed, retrying without context:", err);
      try {
        assistantReply = await askWithContext([], message, userLevel, depthRange);
      } catch (err2) {
        console.error("OpenAI fallback call failed:", err2);
      }
    }

    // Save memory
    if (!assistantReply.startsWith("⚠️")) {
      await saveConversationToMemory(userId, message, assistantReply, mergedProfile, eqState, sessionId, sessionName);
    }

    return res.status(200).json({
      assistantMessage: { role: 'assistant', content: assistantReply },
      metadata: { userLevel, depthRange, contextChunksCount: contextChunks.length },
    });

  } catch (err: any) {
    console.error('❌ Fatal error in /api/openai/chat:', err);
    return res.status(200).json({
      assistantMessage: { role: 'assistant', content: "⚠️ I'm having temporary issues, but I’m still here to chat with you!" },
      metadata: { fallback: true },
    });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };
