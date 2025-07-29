// pages/api/create-thread.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'asst_WnbEd7Jxgf1z2U0ziNWi8yz9';
const WIX_SITE_URL = process.env.WIX_SITE_URL || 'https://your-wix-site.com'; // ✅ Set this in .env
const openai = new OpenAI({ apiKey: OPENAI_API_KEY || '' });

type TextContent = {
  type: 'text';
  text: {
    value: string;
    annotations: any[];
  };
};

/**
 * ✅ Fetch user dive logs directly from Wix live endpoint
 */
async function fetchWixDiveLogs(userId: string): Promise<string[]> {
  try {
    const url = `${WIX_SITE_URL}/_functions/userMemory?userId=${encodeURIComponent(userId)}`;
    const res = await fetch(url, { method: 'GET' });

    if (!res.ok) {
      console.warn(`⚠️ Wix fetch returned status ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (Array.isArray(data.logs)) {
      return data.logs.map((log: Record<string, unknown>) => JSON.stringify(log));
    }
    return [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ Failed to fetch Wix logs:', msg);
    return [];
  }
}

/**
 * ✅ Poll OpenAI assistant run until completion
 */
async function pollRunCompletion(threadId: string, runId: string, maxRetries = 20): Promise<boolean> {
  let retries = 0;
  let delay = 1000;

  while (retries < maxRetries) {
    await new Promise((r) => setTimeout(r, delay));

    try {
      const updatedRun = await openai.beta.threads.runs.retrieve(runId, { thread_id: threadId });
      if (updatedRun.status === 'completed') return true;
      if (updatedRun.status === 'failed') {
        console.error('❌ Run failed:', updatedRun.last_error);
        return false;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('⚠️ Polling error:', msg);
    }

    retries++;
    delay = Math.min(delay * 1.5, 5000);
  }

  console.warn('⚠️ Run did not complete within retries.');
  return false;
}

/**
 * ✅ API handler
 */
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
    // 1️⃣ Create a new conversation thread
    const thread = await openai.beta.threads.create({
      metadata: { createdBy: username, displayName },
    });

    // 2️⃣ Fetch Wix logs (limit to 5 for safety)
    const wixLogs = await fetchWixDiveLogs(username);
    const logsToSend = wixLogs.slice(0, 5);

    for (const log of logsToSend) {
      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: `Past dive log:\n${log}`,
        metadata: { type: 'priorLog', userId: username },
      });
    }

    // 3️⃣ Add initial greeting message
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `Hi, I'm ${displayName}. Let's begin a freediving conversation.`,
    });

    // 4️⃣ Start a run with the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    // 5️⃣ Wait for the assistant to complete its response
    const completed = await pollRunCompletion(thread.id, run.id);

    if (!completed) {
      throw new Error('Run did not complete within allowed time.');
    }

    // 6️⃣ Retrieve assistant's first message
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find((m) => m.role === 'assistant');

    const textBlock = (assistantMessage?.content || []).find(
      (c): c is TextContent => c.type === 'text' && !!c.text?.value
    );

    return res.status(200).json({
      threadId: thread.id,
      initialMessage: textBlock?.text?.value || '👋 Let’s begin!',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create assistant thread';
    console.error('❌ Thread creation error:', msg);
    return res.status(500).json({ error: msg });
  }
}
