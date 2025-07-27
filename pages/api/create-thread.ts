// /pages/api/create-thread.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'asst_WnbEd7Jxgf1z2U0ziNWi8yz9';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || '' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username = 'guest' } = req.body;

  if (!OPENAI_API_KEY) {
    console.warn('⚠️ Missing OpenAI API Key — returning mock data.');
    return res.status(200).json({
      threadId: `mock-${Date.now()}`,
      initialMessage: `👋 Hello ${username}, I’m your freediving AI coach. Ask me anything about EQ, breathwork, or training!`,
    });
  }

  try {
    // Step 1: Create thread
    const thread = await openai.beta.threads.create({
      metadata: { createdBy: username },
    });

    // Step 2: Add user message
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `Hi, I'm ${username}. Let's begin a freediving conversation.`,
    });

    // Step 3: Run assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    // Step 4: Poll run status
    let status = run.status;
    let retries = 0;
    while (status !== 'completed' && retries < 10) {
      await new Promise((r) => setTimeout(r, 1000));
      const updatedRun = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
      status = updatedRun.status;
      retries++;
    }

    if (status !== 'completed') {
      throw new Error('Run did not complete in time.');
    }

    // Step 5: Get last assistant message
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find((m) => m.role === 'assistant');

    const textBlock = (assistantMessage?.content || []).find((c) => {
      return (c as any)?.type === 'text' && (c as any)?.text?.value;
    }) as any;

    return res.status(200).json({
      threadId: thread.id,
      initialMessage: textBlock?.text?.value || "👋 Let’s begin!",
    });
  } catch (err: any) {
    console.error('❌ Thread creation error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to create assistant thread' });
  }
}
