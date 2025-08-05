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

// ✅ Improved numeric PB parsing
function detectUserLevel(profile: any): 'expert' | 'beginner' {
  const pbRaw = profile?.pb || profile?.personalBestDepth || 0;
  const numericPB = parseFloat(pbRaw.toString().replace(/[^\d.]/g, '')) || 0;
  const certLevel = profile?.certLevel || '';
  const isInstructor = profile?.isInstructor;

  if (isInstructor || certLevel.toLowerCase().includes('instructor')) return 'expert';
  if (numericPB >= 80) return 'expert';
  return 'beginner';
}

function getDepthRange(depth: number): string {
  if (!depth || isNaN(depth)) return '10m';
  const rounded = Math.floor(depth / 10) * 10;
  return `${rounded}m`;
}

// ✅ Safe Pinecone query with improved filter
async function queryPinecone(query: string, depthRange: string): Promise<string[]> {
  if (!index) {
    console.warn("⚠️ Pinecone index not initialized.");
    return [];
  }
  try {
    const vector = await getEmbedding(query);
    if (!Array.isArray(vector) || vector.length === 0) return [];

    let result: any = await index.query({
      vector,
      topK: 8,
      includeMetadata: true,
      filter: { approvedBy: { "$eq": "Koval" }, depthRange: { "$in": [depthRange, "all"] } },
    });

    if (!result?.matches?.length) {
      console.warn("⚠️ Pinecone returned no matches, retrying without depth filter.");
      result = await index.query({
        vector,
        topK: 8,
        includeMetadata: true,
        filter: { approvedBy: { "$eq": "Koval" } },
      });
    }

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
You are **Koval Deep AI**, a freediving coaching assistant powered by Daniel Koval's real training data.

### 🎯 Rules:
- Provide expert-level freediving coaching advice ONLY from the given Koval knowledge base.
- Do NOT invent information not in context.
- Prioritize safety, progressive depth adaptation, and realistic training goals.
- Tailor tone and advice to a ${level}-level freediver.

### ✅ Response Format:
1️⃣ Physics & Physiology at ${depthRange}  
2️⃣ Technical Analysis  
3️⃣ Targeted Training Plan  
4️⃣ Safety & Strategy  
5️⃣ Motivator Hook
`;
}

// ✅ Retry logic for OpenAI requests
async function askWithContext(contextChunks: string[], message: string, userLevel: 'expert' | 'beginner', depthRange: string) {
  const context = contextChunks.length
    ? contextChunks.slice(0, 5).join('\n\n')
    : "No relevant Koval knowledge found for this query. Reply with 'I don’t have data on this yet.'";

  const systemPrompt = generateSystemPrompt(userLevel, depthRange);

  let attempts = 0;
  while (attempts < 2) {
    try {
      const response: any = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'system',
            content: `Knowledge Base:\n${context}\n\nOnly answer based on this. If information is missing, say: "I don’t have data on this yet."`,
          },
          { role: 'user', content: message },
        ],
      });

      return response?.choices?.[0]?.message?.content?.trim() || '⚠️ No response generated.';
    } catch (err) {
      console.warn(`OpenAI call attempt ${attempts + 1} failed:`, err);
      await new Promise((res) => setTimeout(res, 500 * (attempts + 1)));
      attempts++;
    }
  }
  return "⚠️ I'm having trouble responding right now, but I'm still online and will try again soon.";
}

// ✅ Safe JSON parsing for profile extraction
async function extractProfileFields(message: string) {
  try {
    const result: any = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        { role: 'system', content: 'Extract freediving profile info from message. Return valid JSON only.' },
        {
          role: 'user',
          content: `Keys: pb (number), certLevel, focus, isInstructor (boolean), discipline, currentDepth (number)\n\n${message}`,
        },
      ],
    });

    let content = result.choices[0].message.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    return JSON.parse(jsonMatch[0]);
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

    // ✅ Safe merge of profile fields
    let mergedProfile = { ...pastMemory?.profile };
    Object.entries(profile).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') mergedProfile[k] = v;
    });

    const extractedProfile = await extractProfileFields(message);
    Object.entries(extractedProfile).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') mergedProfile[k] = v;
    });

    if (pastMemory?.profile?.isInstructor) mergedProfile.isInstructor = true;

    const logDepth = diveLogs?.length ? parseFloat(diveLogs[diveLogs.length - 1]?.reachedDepth || 0) : undefined;
    const depthRange = getDepthRange(mergedProfile.currentDepth || mergedProfile.pb || logDepth || 10);
    const userLevel = detectUserLevel(mergedProfile);

    // ✅ Reload past conversation logs for context
    const historyContext = pastMemory?.logs
      ?.slice(-3)
      .map((l: { userMessage: string; assistantReply: string }) => `User: ${l.userMessage}\nAssistant: ${l.assistantReply}`)
      .join("\n\n") || "";

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

    // Build user context with dive log + history
    let userContext = historyContext ? `${historyContext}\n\nCurrent message: ${message}` : message;
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
    const assistantReply = await askWithContext(contextChunks, userContext, userLevel, depthRange);

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
