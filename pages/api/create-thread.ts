// pages/api/create-thread.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'asst_WnbEd7Jxgf1z2U0ziNWi8yz9';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || '' });

type TextContent = {
  type: 'text';
  text: {
    value: string;
    annotations: any[];
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username = 'guest', displayName = 'Guest Freediver' } = req.body;

  if (!OPENAI_API_KEY) {
    console.warn('⚠️ Missing OpenAI API Key — returning mock data.');
    return res.status(200).json({
      threadId: `mock-${Date.now()}`,
      initialMessage: `👋 Hello ${displayName}, I’m your freediving AI coach.`,
    });
  }

  try {
    const thread = await openai.beta.threads.create({
      metadata: { createdBy: username, displayName },
    });

    const summariesRes = await fetch("https://www.deepfreediving.com/_functions/getUserDiveSummaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: username }),
    });

    const summaries = await summariesRes.json();
    if (Array.isArray(summaries)) {
      for (const summary of summaries) {
        await openai.beta.threads.messages.create(thread.id, {
          role: 'user',
          content: `Past dive summary:\n${summary}`,
          metadata: { type: 'priorLog', userId: username },
        });
      }
    }

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `Hi, I'm ${displayName}. Let's begin a freediving conversation.`,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    let status = run.status;
    let retries = 0;
    const maxRetries = 10;

    while (status !== 'completed' && status !== 'failed' && retries < maxRetries) {
      await new Promise((r) => setTimeout(r, 1000));
      const updatedRun = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
      status = updatedRun.status;
      retries++;
    }

    if (status !== 'completed') {
      throw new Error(`Run did not complete (status: ${status}).`);
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find((m) => m.role === 'assistant');

    const textBlock = (assistantMessage?.content || []).find(
      (c): c is TextContent => c.type === 'text' && !!c.text?.value
    );

    return res.status(200).json({
      threadId: thread.id,
      initialMessage: textBlock?.text?.value || "👋 Let’s begin!",
    });
  } catch (err: any) {
    console.error('❌ Thread creation error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to create assistant thread' });
  }
}
