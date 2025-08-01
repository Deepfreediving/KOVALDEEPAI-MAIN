// pages/api/create-thread.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import handleCors from "@/utils/cors";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'asst_WnbEd7Jxgf1z2U0ziNWi8yz9';
const WIX_SITE_URL = process.env.WIX_SITE_URL || '';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || '' });

type TextContent = {
  type: 'text';
  text: {
    value: string;
    annotations: any[];
  };
};

/**
 * ✅ Helper: Fetch with timeout
 */
async function fetchWithTimeout(url: string, ms = 6000): Promise<Response> {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch request timed out')), ms))
  ]) as Promise<Response>;
}

/**
 * ✅ Fetch user dive logs directly from Wix live endpoint
 */
async function fetchWixDiveLogs(userId: string): Promise<string[]> {
  if (!WIX_SITE_URL || WIX_SITE_URL.includes('your-wix-site')) {
    console.warn('⚠️ WIX_SITE_URL not properly set. Skipping Wix logs fetch.');
    return [];
  }

  try {
    const url = `${WIX_SITE_URL}/_functions/userMemory?userId=${encodeURIComponent(userId)}`;
    const res = await fetchWithTimeout(url, 6000);

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

      if (updatedRun.status === 'failed' || updatedRun.status === 'cancelled') {
        console.error(`❌ Run ended with status: ${updatedRun.status}`, updatedRun.last_error);
        return false;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('⚠️ Polling error:', msg);
      if (msg.includes('4') || msg.includes('Invalid')) return false;
    }

    retries++;
    delay = Math.min(delay * 1.5, 5000);
  }

  console.warn('⚠️ Run did not complete within allowed retries.');
  return false;
}

/**
 * ✅ API handler
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (await handleCors(req, res)) return;
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
    const assistantMessages = messages.data.filter((m) => m.role === 'assistant');

    const textBlock = assistantMessages
      .flatMap((m) => m.content)
      .find((c): c is TextContent => c.type === 'text' && !!c.text?.value);

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
