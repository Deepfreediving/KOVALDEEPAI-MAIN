import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { Pinecone, Index } from '@pinecone-database/pinecone';
import { getMissingProfileField } from '@/lib/coaching/profileIntake';
import { getNextEQQuestion, evaluateEQAnswers } from '@/lib/coaching/eqEngine';

// === Init OpenAI ===
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// === Init Pinecone ===
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

let index: Index;
try {
  index = pinecone.Index(process.env.PINECONE_INDEX || '');
} catch (err) {
  console.error('❌ Pinecone index init error:', err instanceof Error ? err.message : err);
}

// === Embedding Function ===
async function getQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    return response?.data?.[0]?.embedding || [];
  } catch (err) {
    console.error('❌ Embedding error:', err);
    throw new Error('Failed to get embedding.');
  }
}

// === Pinecone Search ===
async function queryPinecone(query: string): Promise<string[]> {
  const embedding = await getQueryEmbedding(query);
  const result = await index.query({
    vector: embedding,
    topK: 6,
    includeMetadata: true,
  });

  return result?.matches?.map((m: any) => m.metadata?.text).filter(Boolean) || [];
}

// === OpenAI Coaching Chat ===
async function askWithContext(contextChunks: string[], question: string): Promise<string> {
  const context = contextChunks.join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `
          You are a freediving coach with expert knowledge in EQ, CO₂ training, narcosis, and dive safety.
          Ask users ONE question at a time to guide them toward the root cause of any problem.
          Do NOT overwhelm the user. Use clear and gentle language.
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

  return response?.choices?.[0]?.message?.content?.trim() || 'No answer generated.';
}

// === MAIN HANDLER ===
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message, userId, profile, eqState } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message must be a non-empty string.' });
  }

  try {
    // === 1: Profile Intake Step ===
    const intakeCheck = getMissingProfileField(profile || {});
    if (intakeCheck) {
      return res.status(200).json({
        type: 'intake',
        key: intakeCheck.key,
        question: intakeCheck.question,
      });
    }

    // === 2: EQ Diagnostic Logic ===
    if (eqState && eqState.currentDepth) {
      const next = getNextEQQuestion(eqState);
      if (next.type === 'question') {
        return res.status(200).json({
          type: 'eq-followup',
          question: next.question,
          key: next.key,
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

    // === 3: Pinecone Fallback ===
    const contextChunks = await queryPinecone(message);

    if (contextChunks.length === 0) {
      return res.status(200).json({
        assistantMessage: {
          role: 'assistant',
          content: '⚠️ No relevant information found for your question.',
        },
      });
    }

    const answer = await askWithContext(contextChunks, message);

    return res.status(200).json({
      assistantMessage: {
        role: 'assistant',
        content: answer,
      },
    });
  } catch (err) {
    console.error('❌ /api/chat internal error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
