import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import axios from 'axios';
import { Pinecone } from '@pinecone-database/pinecone';
import { getNextEQQuestion, evaluateEQAnswers } from '@/lib/coaching/eqEngine';

// === INITIALIZATION ===
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });
const index = pinecone.Index(process.env.PINECONE_INDEX || '');

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

async function getQueryEmbedding(query: string): Promise<number[]> {
  try {
    const res = await Promise.race([
      openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Embedding timeout')), 8000)),
    ]);
    return (res as any)?.data?.[0]?.embedding || [];
  } catch (err) {
    console.error('Embedding error:', err);
    return [];
  }
}

async function queryPinecone(query: string, depthRange: string): Promise<string[]> {
  try {
    const vector = await getQueryEmbedding(query);
    if (!vector.length) return [];

    const result = await index.query({
      vector,
      topK: 8,
      includeMetadata: true,
      filter: {
        approvedBy: 'Koval',
        depthRange: { $in: [depthRange, 'all'] },
      },
    });

    return result?.matches
      ?.map((m) => m.metadata?.text)
      .filter((t): t is string => typeof t === 'string' && t.length > 15) || [];
  } catch (err) {
    console.error('Pinecone query error:', err);
    return [];
  }
}

// ✅ ORIGINAL UNCOMPRESSED PROMPT
function generateSystemPrompt(level: 'expert' | 'beginner', depthRange: string): string {
  return `
You are **Koval Deep AI**, a highly specialized freediving coach assistant created by world-record freediver Daniel Koval.  
Your purpose is to provide **precise, expert-level coaching** for deep freediving based on real-world elite training methodology.

### 🎯 Primary Rules:
- **Analyze diver context first**: Use their latest dive logs, PB depth, target depth, and any technical details they provide.
- **Never reset to beginner mode** unless diver PB < 40m and logs confirm beginner level.
- **Always coach for safe progression**, identifying bottlenecks that prevent deeper dives.
- Use **technical, high-performance freediving language**, avoid filler advice like "practice more".
- If the diver provides numbers (depth, equalization limits, mouthfill behavior, etc.), **diagnose and suggest next-step drills** that directly address the problem.

---

### ✅ Response Structure:
1️⃣ **Physics & Physiology:** Explain what’s happening physically at this depth (${depthRange}), including air compression, RV, pressure effects on mouthfill, blood shift, or hypoxic risks.  
2️⃣ **Technical Analysis:** Identify what is limiting progression based on their logs and technique details (e.g., losing mouthfill at 80m, air management inefficiency, tension).  
3️⃣ **Targeted Training Plan:** Give **specific drills, depth strategy, or dry exercises** to fix the issue and safely push toward their **target depth** (e.g., 120m from 112m).  
4️⃣ **Safety & Strategy:** Highlight any safety margins, recommended buddy setup, or training sequences for the next sessions.  
5️⃣ **Motivator Hook:** End with a short, powerful mental coaching statement or insight that builds confidence and focus.

---

### ⚠️ Forbidden:
- Do **NOT** give vague advice like "relax more", "equalize better", or "just train longer".
- Do **NOT** make up medical or unsafe information.
- Avoid unrelated agency standards (SSI, PADI, AIDA) unless specifically requested for comparison.

You are a **precision deep freediving coach**, not a casual chatbot.  
Your goal is to make each answer feel like **a world-class personal coaching session**, as if Daniel Koval himself is analyzing the dive and giving next-step drills to break past limits safely.
`;
}

async function askWithContext(contextChunks: string[], message: string, userLevel: 'expert' | 'beginner', depthRange: string) {
  const context = contextChunks.join('\n\n');
  const systemPrompt = generateSystemPrompt(userLevel, depthRange);

  try {
    const response = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.4,
        max_tokens: 800,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Relevant Koval knowledge:\n${context}\n\nUser input:\n${message}` },
        ],
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Chat completion timeout')), 15000)),
    ]);

    return (response as any).choices?.[0]?.message?.content?.trim() || '⚠️ No response generated.';
  } catch (err) {
    console.error('Chat completion error:', err);
    return '⚠️ I encountered a processing issue. Please try again.';
  }
}

async function extractProfileFields(message: string) {
  const extractionPrompt = `Extract freediving profile info from this message.
Return JSON with keys: pb (number), certLevel, focus, isInstructor (boolean), discipline, currentDepth (number).`;

  try {
    const result = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        { role: 'system', content: 'You are a precise information extractor for freediving profiles.' },
        { role: 'user', content: message },
      ],
    });

    return JSON.parse(result.choices[0].message.content || '{}');
  } catch {
    return {};
  }
}

async function saveToWixMemory({
  userId,
  logEntry,
  memoryContent,
  profile,
  eqState,
  metadata,
  sessionId,
  sessionName,
}: {
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
      userId,
      logEntry,
      memoryContent,
      eqState,
      profile,
      sessionId,
      sessionName,
      timestamp: new Date().toISOString(),
      metadata,
    });
  } catch (err: any) {
    console.error('❌ Failed to save to Wix:', err.response?.data || err.message);
  }
}

const handleCors = (req: NextApiRequest, res: NextApiResponse): boolean => {
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://www.deepfreediving.com',
    'https://kovaldeepai-main.vercel.app',
    /^https:\/\/kovaldeepai-main-[a-z0-9]+\.vercel\.app$/,
    'http://localhost:3000',
  ];

  const isAllowed = allowedOrigins.some((allowed) =>
    typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
  );

  if (isAllowed) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
};

// === MAIN HANDLER ===
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const {
    message,
    userId = 'guest',
    profile = {},
    eqState,
    diveLogs = [],
    intakeCount = 0,
    uploadOnly,
    sessionId,
    sessionName,
  } = req.body;

  if (!message && uploadOnly) {
    return res.status(200).json({
      assistantMessage: {
        role: 'assistant',
        content: '✅ Dive images uploaded. I’ll analyze them when relevant!',
      },
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
    const depthRange = getDepthRange(
      mergedProfile.currentDepth || mergedProfile.pb || logDepth || 10
    );
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

    // Build user context message
    let userContext = message;
    if (diveLogs?.length) {
      const lastLog = diveLogs[diveLogs.length - 1];
      userContext += `\n\nHere is my most recent dive log: ${JSON.stringify(lastLog)}. Evaluate this dive and help me progress safely toward ${mergedProfile.targetDepth || 120}m.`;
    }

    // Query Pinecone
    const contextChunks = await queryPinecone(userContext, depthRange);
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
      assistantMessage: {
        role: 'assistant',
        content: assistantReply,
      },
    });
  } catch (err: any) {
    console.error('❌ Error in /api/chat.ts:', {
      error: err.message || err,
      requestHeaders: req.headers,
      body: req.body,
    });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
