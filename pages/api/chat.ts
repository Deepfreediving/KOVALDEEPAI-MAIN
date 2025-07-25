// /pages/api/chat.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
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
  if (!profile) return 'beginner';

  const pb = profile.pb || profile.personalBestDepth;
  const { certLevel, isInstructor } = profile;

  const numericPB = typeof pb === 'string' ? parseFloat(pb.replace(/[^\d.]/g, '')) : pb;
  if (numericPB && numericPB >= 80) return 'expert';
  if (isInstructor || (certLevel && certLevel.toLowerCase().includes('instructor'))) return 'expert';

  return 'beginner';
}

// === Coaching System Prompt ===
function generateSystemPrompt(userLevel: 'expert' | 'beginner'): string {
  if (userLevel === 'expert') {
    return `
      You are Koval Deep AI, a world-class freediving coach.
      For users with PB > 80m or instructor credentials, use expert coaching mode.
      • Provide tactical feedback, targeted drills, and concise advice.
      • Avoid long intake sequences. Ask max 3 strategic follow-ups.
      • Use bullet points and give direct suggestions they can act on today.
    `.trim();
  }

  return `
    You are a freediving coach with expert knowledge of EQ, physiology, training, and dive safety.
    • Guide the user to the root of their issue through reasoning and short, clear follow-ups.
    • Ask no more than 4 intake questions before offering diagnosis or actionable advice.
    • Avoid overwhelming. Be structured, explanatory, and gentle.
    • Use formatting and clear language to engage the diver.
  `.trim();
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

// === GPT Response Wrapper ===
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

// === Logging (Extend Later) ===
function logChat(userId: string, message: string, role: 'user' | 'assistant') {
  console.log(`📥 [${role}] ${userId}: ${message}`);
}

// === Handler ===
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const {
    message,
    userId = 'anonymous',
    profile = {},
    eqState,
    uploadOnly,
    intakeCount = 0, // NEW: track how many profile questions already asked
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

    // === Intake Flow (limit to 4 questions max)
    const userLevel = detectUserLevel(profile);
    const intakeCheck = getMissingProfileField(profile || {});

    if (intakeCheck && userLevel === 'beginner' && intakeCount < 4) {
      return res.status(200).json({
        type: 'intake',
        key: intakeCheck.key,
        question: intakeCheck.question,
        metadata: {
          intentLabel: 'profile-intake',
          saveThis: true,
          intakeCount: intakeCount + 1,
        },
      });
    }

    // === EQ Diagnostic Flow
    if (eqState?.currentDepth) {
      const next = getNextEQQuestion(eqState);
      if (next.type === 'question') {
        return res.status(200).json({
          type: 'eq-followup',
          key: next.key,
          question: next.question,
          metadata: {
            intentLabel: 'eq-followup',
            saveThis: true,
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
            saveThis: true,
          },
        });
      }
    }

    // === Query Memory
    const contextChunks = await queryPinecone(message);

    // Fallback if memory empty
    if (contextChunks.length === 0) {
      return res.status(200).json({
        assistantMessage: {
          role: 'assistant',
          content: '⚠️ I couldn’t find relevant training data for your question. You can still ask anything!',
        },
        metadata: {
          intentLabel: 'no-context-found',
          sessionType: 'general',
        },
      });
    }

    // === Ask GPT in Coaching Mode
    const answer = await askWithContext(contextChunks, message, userLevel);

    logChat(userId, answer, 'assistant');

    return res.status(200).json({
      assistantMessage: {
        role: 'assistant',
        content: answer,
      },
      metadata: {
        intentLabel: 'ai-response',
        sessionType: 'training',
        userLevel,
        saveThis: true,
      },
    });
  } catch (err) {
    console.error('❌ Internal error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
