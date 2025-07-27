// /pages/api/chat.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import axios from 'axios';
import { Pinecone } from '@pinecone-database/pinecone';
import { getNextEQQuestion, evaluateEQAnswers } from '@/lib/coaching/eqEngine';

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
You specialize in helping divers past 80m troubleshoot depth-specific limitations, from EQ and CO₂ tolerance to narcosis and lung strain.
Always offer targeted feedback with reasoning, tradeoffs, and root-cause thinking. Always provide truthful, detailed, factual, and actionable coaching advice with exact details when recommending any training tools.
Ask only one question at a time. Never overwhelm the diver. Factor in dive logs, and issues when give advice.
Behave like a real coach — adapt based on their answers and guide with clarity.
Never give medical advice, but ensure all training feedback is medically accurate and safe.`
    : `You are Koval AI, a supportive freediving assistant and coach for beginner and intermediate freedivers shallower than 80m.
Guide them through their goals, ask simple personalized questions one at a time, and explain the reasoning behind suggestions.
Never overwhelm. Keep it safe, actionable, and tailored. Always give detailed knowledge straight from your sources with truthful and factual data.
Never change any structured training tools or drills unless increasing the difficulty or intensity.
Always provide clear, actionable, and safe advice. 
Never give medical advice, but ensure all training feedback is medically accurate and safe.`;
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
  const result = await index.query({ vector, topK: 6, includeMetadata: true });
  return result?.matches?.map(m => m.metadata?.text).filter(Boolean) || [];
}

async function askWithContext(contextChunks: string[], message: string, userLevel: 'expert' | 'beginner') {
  const systemPrompt = generateSystemPrompt(userLevel);
  const context = contextChunks.join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    temperature: 0.4,
    max_tokens: 700,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Context:\n${context}\n\nUser:\n${message}` },
    ],
  });

  return response.choices[0]?.message?.content?.trim() || '⚠️ No reply generated.';
}

async function extractProfileFields(message: string) {
  const extractionPrompt = `Extract relevant freediving profile fields from the user's message.
Output JSON with keys: pb, certLevel, focus, isInstructor (boolean), discipline.
If unknown, omit the key. Example output: {"pb":112, "certLevel":"AIDA", "focus":"EQ", "isInstructor":false, "discipline":"CWT"}

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
  } catch (err) {
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
    console.error('❌ Wix save error:', err.response?.data || err.message);
  }
}

// === CORS ===
const handleCors = (req: NextApiRequest, res: NextApiResponse): boolean => {
  const origin = req.headers.origin || '';
  const isAllowed =
    origin === 'https://www.deepfreediving.com' ||
    origin === 'https://kovaldeepai-main.vercel.app' ||
    /^https:\/\/kovaldeepai-main-[a-z0-9]+\.vercel\.app$/.test(origin);

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

    // === EQ Diagnostics ===
    if (eqState?.currentDepth) {
      const followup = getNextEQQuestion(eqState);
      if (followup.type === 'question') {
        return res.status(200).json({ type: 'eq-followup', key: followup.key, question: followup.question });
      } else if (followup.type === 'diagnosis-ready') {
        const result = evaluateEQAnswers(eqState.answers);
        return res.status(200).json({ type: 'eq-diagnosis', label: result.label, drills: result.drills });
      }
    }

    // === Pinecone Context Chat ===
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
    console.error('❌ Error in /api/chat.ts:', err.message || err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
