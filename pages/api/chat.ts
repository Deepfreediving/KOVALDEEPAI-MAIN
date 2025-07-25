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

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

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

// === Embedding & Retrieval ===
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

async function askWithContext(contextChunks: string[], question: string): Promise<string> {
  const context = contextChunks.join('\n\n');
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `
          You are a freediving coach with expert knowledge in EQ, O2, CO₂ training, Nitrogen, technique and dive safety.
          Ask users ONE question at a time to guide them toward the root cause of any problem.
          Do NOT overwhelm the user. Use clear and gentle language but clean and structured and visually appealing.
          If enough data is gathered, diagnose and explain your reasoning, then offer drills.
          Always explain the reasoning behind a recommendation or offer pros and cons.
        `.trim(),
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 700,
  });

  return response?.choices?.[0]?.message?.content?.trim() || '⚠️ No response generated.';
}

// === Main Handler ===
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    message,
    userId,
    username,
    profile,
    eqState,
    uploadOnly,
    thread_id,
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
    console.log(`📩 Message from ${username || 'user'}: ${message}`);

    // === 1. Profile Intake Logic ===
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

    // === 2. EQ Flow Logic ===
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

    // === 3. Retrieve Training Context ===
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

    // === 4. Generate AI Reply ===
    const answer = await askWithContext(contextChunks, message);

    return res.status(200).json({
      assistantMessage: {
        role: 'assistant',
        content: answer,
      },
      metadata: {
        intentLabel: 'ai-response',
        sessionType: 'training',
        saveThis: true,
      },
    });
  } catch (err) {
    console.error('❌ /api/chat internal error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
