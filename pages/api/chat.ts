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

// === OpenAI & Pinecone Setup ===
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });

let index: Index;
try {
  index = pinecone.Index(process.env.PINECONE_INDEX || '');
} catch (err) {
  console.error('❌ Pinecone index init error:', err instanceof Error ? err.message : err);
}

// === 🧠 User Level Detection ===
function detectUserLevel(profile: any): 'expert' | 'beginner' {
  if (!profile) return 'beginner';
  const { personalBestDepth, certLevel, isInstructor } = profile;

  const numericPB = typeof personalBestDepth === 'string'
    ? parseFloat(personalBestDepth.replace(/[^\d.]/g, ''))
    : personalBestDepth;

  if (numericPB && numericPB >= 80) return 'expert';
  if (isInstructor || (certLevel && certLevel.toLowerCase().includes('instructor'))) return 'expert';

  return 'beginner';
}

// === 🧠 Dynamic Coaching Prompt Generator ===
function generateSystemPrompt(userLevel: 'expert' | 'beginner'): string {
  if (userLevel === 'expert') {
    return `
      You are Koval Deep AI, a world-class freediving coach.
      If the user has a PB > 80m, or is a certified instructor trainer, or mentions advanced training experience, treat them as a peer-level diver.
      Switch to coaching mode: provide concise, tactical solutions, structured routines, dry training advice, and targeted technique fixes.
      Avoid diagnostic over-questioning. Don't hesitate to give knowledge, explain reasoning, and incorporate a strategic follow-up only if essential.
      Use bullet points and clearly outline what the diver can apply today.
    `.trim();
  }

  return `
    You are a freediving coach with expert knowledge in EQ, Oxygen, CO₂ training, freedive physiology, freedive physics, Nitrogen, mammalian dive reflex, adaptation technique, and dive safety.
    Ask ONE–TWO clear, purposeful questions at a time. Use comparison and deductive logic to move closer to root issues.
    Do NOT overwhelm the user. Maintain clarity, offer structure, and visually appealing formatting.
    If enough context exists, diagnose and explain the cause, then offer actionable drills, routines, and advice.
    Always explain your reasoning, and consider pros and cons of each recommendation.
  `.trim();
}

// === 🔍 Pinecone Vector Querying ===
async function getQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    return response?.data?.[0]?.embedding || [];
  } catch (err) {
    console.error('❌ Embedding error:', err);
    throw new Error('Failed to generate embedding.');
  }
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
    console.error('❌ Pinecone query failed:', err);
    return [];
  }
}

// === 🧠 Ask GPT with Context + Coaching Logic ===
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

// === 📝 Log (Extend to DB Later) ===
function logChat(userId: string, message: string, role: 'user' | 'assistant') {
  console.log(`📥 [${role}] ${userId}: ${message}`);
  // Optional: Persist to external DB
}

// === 🌊 Main Handler ===
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const {
    message,
    userId = 'anonymous',
    username,
    profile,
    eqState,
    uploadOnly,
    thread_id, // not used yet
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

    // === 1. Profile Intake
    const intakeCheck = getMissingProfileField(profile || {});
    if (intakeCheck) {
      return res.status(200).json({
        type: 'intake',
        key: intakeCheck.key,
        question: intakeCheck.question,
        metadata: {
          intentLabel: 'profile-intake',
          saveThis: true,
        },
      });
    }

    // === 2. EQ Followup / Diagnosis
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

    // === 3. Determine Coaching Level
    const userLevel = detectUserLevel(profile);

    // === 4. Vector Search via Pinecone
    const contextChunks = await queryPinecone(message);

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

    // === 5. Ask GPT in Coach Mode
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
    console.error('❌ /api/chat internal error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
