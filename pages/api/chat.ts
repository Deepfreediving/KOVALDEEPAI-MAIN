import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import axios from 'axios';
import { Pinecone } from '@pinecone-database/pinecone';
import { getNextEQQuestion, evaluateEQAnswers } from '@/lib/coaching/eqEngine';

// Initialize OpenAI and Pinecone
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });
const index = pinecone.Index(process.env.PINECONE_INDEX || '');

// === SYSTEM PROMPTS ===
function detectUserLevel(profile: any): 'expert' | 'beginner' {
  const pb = profile?.pb || profile?.personalBestDepth;
  const certLevel = profile?.certLevel || '';
  const isInstructor = profile?.isInstructor;
  const numericPB = typeof pb === 'string' ? parseFloat(pb.replace(/[^\d.]/g, '')) : pb;
  if (numericPB && numericPB >= 80) return 'expert';
  if (isInstructor || certLevel.toLowerCase().includes('instructor')) return 'expert';
  return 'beginner';
}

function generateSystemPrompt(level: 'expert' | 'beginner'): string {
  return level === 'expert'
    ? `You are Koval Deep AI, an elite freediving coach trained in EN.C.L.O.S.E. diagnostics and high-performance coaching systems.
You help divers over 80m solve EQ, narcosis, lung strain, and CO₂ limitations.
Always provide accurate, safe, detailed, and actionable training advice.`
    : `You are Koval AI, a supportive assistant for beginner freedivers training below 80m.
Guide one step at a time. Ensure all advice is safe, clear, personalized, and non-medical.`;
}

// === UTILITIES ===
async function getQueryEmbedding(query: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  return res?.data?.[0]?.embedding || [];
}

async function queryPinecone(query: string): Promise<string[]> {
  const vector = await getQueryEmbedding(query);
  const result = await index.query({
    vector,
    topK: 6,
    includeMetadata: true,
  });
  return result?.matches
    ?.map((m) => m.metadata?.text)
    .filter((t): t is string => typeof t === 'string' && t.length > 20) || [];
}

async function askWithContext(contextChunks: string[], message: string, userLevel: 'expert' | 'beginner') {
  const context = contextChunks.join('\n\n');
  const systemPrompt = generateSystemPrompt(userLevel);

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    temperature: 0.4,
    max_tokens: 700,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Context:\n${context}\n\nUser:\n${message}` },
    ],
  });

  return response.choices[0]?.message?.content?.trim() || '⚠️ No response generated.';
}

async function extractProfileFields(message: string) {
  const extractionPrompt = `Extract relevant freediving profile fields from the user's message.
Return JSON with keys: pb, certLevel, focus, isInstructor (boolean), discipline. Omit if unknown.

Example: {"pb":112, "certLevel":"AIDA", "focus":"EQ", "isInstructor":false, "discipline":"CWT"}

User: ${message}`;

  const result = await openai.chat.completions.create({
    model: 'gpt-4',
    temperature: 0,
    messages: [
      { role: 'system', content: 'You are a precise information extractor for freediving profiles.' },
      { role: 'user', content: extractionPrompt },
    ],
  });

  try {
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

// === CORS HANDLER ===
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
    const extractedProfile = await extractProfileFields(message);
    const mergedProfile = { ...profile, ...extractedProfile };
    const userLevel = detectUserLevel(mergedProfile);

    // EQ Follow-up
    if (eqState?.currentDepth) {
      const followup = getNextEQQuestion(eqState);
      if (followup.type === 'question') {
        return res.status(200).json({ type: 'eq-followup', key: followup.key, question: followup.question });
      } else if (followup.type === 'diagnosis-ready') {
        const result = evaluateEQAnswers(eqState.answers);
        return res.status(200).json({ type: 'eq-diagnosis', label: result.label, drills: result.drills });
      }
    }

    // Chat with contextual memory
    const contextChunks = await queryPinecone(message);
    const assistantReply = await askWithContext(contextChunks, message, userLevel);

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
