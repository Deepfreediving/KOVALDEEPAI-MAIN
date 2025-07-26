// /pages/api/chat.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import axios from 'axios';
import { Pinecone, Index } from '@pinecone-database/pinecone';
import { getMissingProfileField } from '@/lib/coaching/profileIntake';
import { getNextEQQuestion, evaluateEQAnswers } from '@/lib/coaching/eqEngine';

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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });
let index: Index;
try {
  index = pinecone.Index(process.env.PINECONE_INDEX || '');
} catch (err) {
  console.error('❌ Pinecone index error:', err);
}

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
  if (level === 'expert') {
    return `You are Koval Deep AI, an elite freediving coach trained in EN.C.L.O.S.E. diagnostics and high-performance coaching systems.
You specialize in helping divers past 80m troubleshoot depth-specific limitations, from EQ and CO₂ tolerance to narcosis and lung strain.
Always offer targeted feedback with reasoning, tradeoffs, and root-cause thinking.
Ask only one question at a time. Never overwhelm the diver.
Behave like a real coach — adapt based on their answers and guide with clarity.
Never give medical advice, but ensure all training feedback is medically accurate and safe.`;
  } else {
    return `You are Koval AI, a supportive freediving assistant for beginner and intermediate freedivers.
Guide them through their goals, ask simple personalized questions one at a time, and explain the reasoning behind suggestions.
Never overwhelm. Keep it safe, actionable, and tailored.`;
  }
}

async function getQueryEmbedding(query: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  return response?.data?.[0]?.embedding || [];
}

async function queryPinecone(query: string): Promise<string[]> {
  try {
    const embedding = await getQueryEmbedding(query);
    const result = await index.query({
      vector: embedding,
      topK: 6,
      includeMetadata: true,
    });
    return result?.matches?.map((m: any) => m.metadata?.text).filter(Boolean) || [];
  } catch (err) {
    console.error('❌ Pinecone query error:', err);
    return [];
  }
}

async function askWithContext(contextChunks: string[], question: string, userLevel: 'expert' | 'beginner'): Promise<string> {
  const systemPrompt = generateSystemPrompt(userLevel);
  const context = contextChunks.join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
    ],
    temperature: 0.3,
    max_tokens: 700,
  });

  return response?.choices?.[0]?.message?.content?.trim() || '⚠️ No response generated.';
}

function defaultSessionName() {
  const now = new Date();
  return `Session – ${now.toISOString().split('T')[0]}`;
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
      sessionId: sessionId || null,
      sessionName: sessionName || defaultSessionName(),
      timestamp: new Date().toISOString(),
      metadata,
    });
    console.log(`✅ Memory saved for ${userId}`);
  } catch (err: any) {
    console.error('❌ Wix save error:', err.response?.data || err.message);
  }
}

function logChat(userId: string, message: string, role: 'user' | 'assistant') {
  console.log(`📥 [${role}] ${userId}: ${message}`);
}

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
    logChat(userId, message, 'user');
    const userLevel = detectUserLevel(profile);

    const intakeCheck = getMissingProfileField(profile);
    if (intakeCheck && intakeCount < 4) {
      const updatedProfile = { ...profile, [intakeCheck.key]: message };
      const nextMissing = getMissingProfileField(updatedProfile);

      await saveToWixMemory({
        userId,
        logEntry: message,
        memoryContent: '',
        profile: updatedProfile,
        eqState,
        sessionId,
        sessionName,
        metadata: {
          intentLabel: 'profile-intake',
          sessionType: 'intake',
          intakeCount: intakeCount + 1,
        },
      });

      if (nextMissing) {
        return res.status(200).json({
          type: 'intake',
          key: nextMissing.key,
          question: nextMissing.question,
        });
      } else {
        return res.status(200).json({
          assistantMessage: {
            role: 'assistant',
            content: "Thanks! That’s all I need. Ready to dive into some coaching?",
          },
        });
      }
    }

    if (eqState?.currentDepth) {
      const next = getNextEQQuestion(eqState);
      if (next.type === 'question') {
        return res.status(200).json({
          type: 'eq-followup',
          key: next.key,
          question: next.question,
        });
      } else if (next.type === 'diagnosis-ready') {
        const result = evaluateEQAnswers(eqState.answers);
        return res.status(200).json({
          type: 'eq-diagnosis',
          label: result.label,
          drills: result.drills,
        });
      }
    }

    const contextChunks = await queryPinecone(message);
    const reply = await askWithContext(contextChunks, message, userLevel);

    logChat(userId, reply, 'assistant');

    await saveToWixMemory({
      userId,
      logEntry: message,
      memoryContent: reply,
      profile,
      eqState,
      sessionId,
      sessionName: sessionName || defaultSessionName(),
      metadata: {
        intentLabel: 'ai-response',
        sessionType: 'training',
        userLevel,
      },
    });

    return res.status(200).json({
      assistantMessage: {
        role: 'assistant',
        content: reply,
      },
    });
  } catch (err: any) {
    console.error('❌ Handler error:', err.message || err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
