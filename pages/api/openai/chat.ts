import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import axios from 'axios';
import { Pinecone } from '@pinecone-database/pinecone';
import { getNextEQQuestion, evaluateEQAnswers } from '@/lib/coaching/eqEngine';
import getEmbedding from '@/lib/getEmbedding';
import handleCors from "@/utils/cors";
import { queryData } from '@/lib/queryData';   // ✅ FIXED IMPORT

// === ENVIRONMENT CHECKS ===
if (!process.env.OPENAI_API_KEY) console.error("⚠️ Missing OPENAI_API_KEY");
if (!process.env.PINECONE_API_KEY) console.error("⚠️ Missing PINECONE_API_KEY");
if (!process.env.PINECONE_INDEX) console.error("⚠️ Missing PINECONE_INDEX");

// === INITIALIZATION ===
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });
const index = process.env.PINECONE_INDEX ? pinecone.index(process.env.PINECONE_INDEX) : null;

// === HELPERS ===
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
    if (!vector.length) return [];

    const result: any = await index.query({
      vector,
      topK: 8,
      includeMetadata: true,
      filter: {
        approvedBy: 'Koval',
        depthRange: { $in: [depthRange, 'all'] },
      },
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
You are **Koval Deep AI**, a highly specialized freediving coach assistant created by world-record freediver Daniel Koval.  
Your purpose is to provide **precise, expert-level coaching** for deep freediving based on real-world elite training methodology.

### 🎯 Primary Rules:
- Analyze diver context first.
- Never reset to beginner mode unless diver PB < 40m.
- Always coach for safe progression.
- Use technical, high-performance freediving language.
- Avoid filler advice like "practice more".

---

### ✅ Response Structure:
1️⃣ **Physics & Physiology:** Explain what's happening physically at ${depthRange}.  
2️⃣ **Technical Analysis:** Identify limitations based on logs.  
3️⃣ **Targeted Training Plan:** Give specific drills or depth strategies to safely reach target depth.  
4️⃣ **Safety & Strategy:** Highlight safety margins.  
5️⃣ **Motivator Hook:** Strong mental coaching insight.

⚠️ Forbidden: vague advice, made-up medical info, irrelevant standards.
`;
}

async function askWithContext(contextChunks: string[], message: string, userLevel: 'expert' | 'beginner', depthRange: string) {
  const context = contextChunks.join('\n\n');
  const systemPrompt = generateSystemPrompt(userLevel, depthRange);

  try {
    const response: any = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.4,
        max_tokens: 800,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Relevant Koval knowledge:\n${context}\n\nUser input:\n${message}` },
        ],
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Chat timeout')), 15000)),
    ]);

    return response?.choices?.[0]?.message?.content?.trim() || '⚠️ No response generated.';
  } catch (err) {
    console.error('Chat completion error:', err);
    return '⚠️ I encountered a processing issue. Please try again.';
  }
}

async function extractProfileFields(message: string) {
  const extractionPrompt = `Extract freediving profile info from this message.
Return JSON with keys: pb (number), certLevel, focus, isInstructor (boolean), discipline, currentDepth (number).`;

  try {
    const result: any = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        { role: 'system', content: 'You are a precise information extractor for freediving profiles.' },
        { role: 'user', content: extractionPrompt + "\n\n" + message },
      ],
    });

    return JSON.parse(result.choices[0].message.content || '{}');
  } catch (err) {
    console.error("Profile extraction error:", err);
    return {};
  }
}

async function saveToWixMemory(params: {
  userId: string;
  logEntry: string;
  memoryContent: string;
  profile: any;
  eqState?: any;
  metadata?: any;
  sessionId?: string;
  sessionName?: string;
}) {
  try {
    await axios.post('https://www.deepfreediving.com/_functions/saveToUserMemory', {
      ...params,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('❌ Failed to save to Wix:', err.response?.data || err.message);
  }
}

// Removed local declaration of handleCors as it is already imported.

// === MAIN HANDLER ===
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (await handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const {
    message,
    userId = 'guest',
    profile = {},
    eqState,
    diveLogs = [],
    uploadOnly,
    sessionId,
    sessionName,
  } = req.body;

  if (!message && uploadOnly) {
    return res.status(200).json({
      assistantMessage: { role: 'assistant', content: '✅ Dive images uploaded. I’ll analyze them when relevant!' },
      metadata: { sessionType: 'upload-only' },
    });
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message must be a non-empty string.' });
  }

  try {
    // Extract profile info
    const extractedProfile = await extractProfileFields(message);
    const mergedProfile = { ...profile, ...extractedProfile };

    // Determine depth from logs, PB, or message
    const logDepth = diveLogs?.length ? parseFloat(diveLogs[diveLogs.length - 1]?.reachedDepth || 0) : undefined;
    const depthRange = getDepthRange(mergedProfile.currentDepth || mergedProfile.pb || logDepth || 10);
    const userLevel = detectUserLevel(mergedProfile);

    // Handle EQ follow-up
    if (eqState?.currentDepth) {
      const followup = getNextEQQuestion(eqState);
      if (followup.type === 'question') {
        return res.status(200).json({ type: 'eq-followup', key: followup.key, question: followup.question });
      } else if (followup.type === 'diagnosis-ready') {
        const result = evaluateEQAnswers(eqState.answers);
        return res.status(200).json({ type: 'eq-diagnosis', label: result.label, drills: result.drills });
      }
    }

    // Build user context
    let userContext = message;
    if (diveLogs?.length) {
      const lastLog = diveLogs[diveLogs.length - 1];
      userContext += `\n\nHere is my most recent dive log: ${JSON.stringify(lastLog)}. Evaluate this dive and help me progress safely toward ${mergedProfile.targetDepth || 120}m.`;
    }

    // Query Pinecone
    const contextChunks = await queryPinecone(userContext, depthRange);

    // Generate AI response
    const assistantReply = await askWithContext(contextChunks, userContext, userLevel, depthRange);

    // Save to memory
    await saveToWixMemory({
      userId,
      logEntry: message,
      memoryContent: assistantReply,
      profile: mergedProfile,
      eqState,
      sessionId,
      sessionName,
      metadata: {
        sessionType: 'training',
        intentLabel: 'ai-response',
        userLevel,
        depthRange,
      },
    });

    return res.status(200).json({
      assistantMessage: { role: 'assistant', content: assistantReply },
      metadata: { userLevel, depthRange, contextChunksCount: contextChunks.length },
    });
  } catch (err: any) {
    console.error('❌ Error in /api/chat.ts:', { error: err.message || err });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};
