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

// === AI Setup ===
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });

let index: Index;
try {
  index = pinecone.Index(process.env.PINECONE_INDEX || '');
} catch (err) {
  console.error('❌ Pinecone index init error:', err instanceof Error ? err.message : err);
}

// === User Level Detection ===
function detectUserLevel(profile: any): 'expert' | 'beginner' {
  const pb = profile?.pb || profile?.personalBestDepth;
  const certLevel = profile?.certLevel || '';
  const isInstructor = profile?.isInstructor;

  const numericPB = typeof pb === 'string' ? parseFloat(pb.replace(/[^\d.]/g, '')) : pb;
  if (numericPB && numericPB >= 80) return 'expert';
  if (isInstructor || certLevel.toLowerCase().includes('instructor')) return 'expert';
  return 'beginner';
}

// === System Prompt ===
function generateSystemPrompt(level: 'expert' | 'beginner'): string {
  return level === 'expert'
    ? `You are Koval Deep AI, a professional freediving coach. Speak to instructors and expert athletes (>80m). Be tactical.`
    : `You are Koval AI, a friendly freediving coach. Help newer divers with guidance, onboarding, and EQ support.`;
}

// === Embedding + Retrieval ===
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

// ✅ === Ask GPT With Context ===
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

// === Save Memory to Wix ===
async function saveToWixMemory({
  userId,
  logEntry,
  memoryContent,
  profile,
  eqState,
  metadata,
}: {
  userId: string;
  logEntry: string;
  memoryContent: string;
  profile: any;
  eqState?: any;
  metadata?: any;
}) {
  try {
    await axios.post('https://www.deepfreediving.com/_functions/saveToUserMemory', {
      userId,
      logEntry,
      memoryContent,
      eqState,
      profile,
      timestamp: new Date().toISOString(),
      metadata,
    });
    console.log(`✅ Chat log saved for ${userId}`);
  } catch (err: any) {
    console.error('❌ Failed to save to Wix:', err.response?.data || err.message);
  }
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
    threadTitle, // Optional editable session name
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
    const userLevel = detectUserLevel(profile);
    const sessionTitle = threadTitle || `Session – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    // === 1. Intake flow
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
        metadata: {
          intentLabel: 'profile-intake',
          sessionType: 'intake',
          title: sessionTitle,
        },
      });

      if (nextMissing) {
        return res.status(200).json({
          type: 'intake',
          key: nextMissing.key,
          question: nextMissing.question,
          metadata: {
            intentLabel: 'profile-intake',
            sessionType: 'intake',
            title: sessionTitle,
          },
        });
      } else {
        return res.status(200).json({
          assistantMessage: {
            role: 'assistant',
            content: "Thanks! That's all I need to get started. Ready to dive into some coaching?",
          },
          metadata: {
            sessionType: 'intake-complete',
            title: sessionTitle,
          },
        });
      }
    }

    // === 2. EQ logic
    if (eqState?.currentDepth) {
      const next = getNextEQQuestion(eqState);

      if (next.type === 'question') {
        return res.status(200).json({
          type: 'eq-followup',
          key: next.key,
          question: next.question,
          metadata: {
            intentLabel: 'eq-followup',
            sessionType: 'eq',
            title: sessionTitle,
          },
        });
      } else if (next.type === 'diagnosis-ready') {
        const result = evaluateEQAnswers(eqState.answers);
        return res.status(200).json({
          type: 'eq-diagnosis',
          label: result.label,
          drills: result.drills,
          metadata: {
            intentLabel: 'eq-diagnosis',
            sessionType: 'diagnostic',
            title: sessionTitle,
          },
        });
      }
    }

    // === 3. General coaching
    const contextChunks = await queryPinecone(message);
    const reply = await askWithContext(contextChunks, message, userLevel);

    await saveToWixMemory({
      userId,
      logEntry: message,
      memoryContent: reply,
      profile,
      eqState,
      metadata: {
        intentLabel: 'ai-response',
        sessionType: 'training',
        userLevel,
        title: sessionTitle,
      },
    });

    return res.status(200).json({
      assistantMessage: {
        role: 'assistant',
        content: reply,
      },
      metadata: {
        intentLabel: 'ai-response',
        sessionType: 'training',
        userLevel,
        title: sessionTitle,
      },
    });

  } catch (err: any) {
    console.error('❌ Internal error:', err.message || err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
