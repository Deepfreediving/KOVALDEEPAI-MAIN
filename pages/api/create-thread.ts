import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = 'asst_WnbEd7Jxgf1z2U0ziNWi8yz9';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || '' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username } = req.body;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required and must be a string.' });
  }

  if (!OPENAI_API_KEY) {
    console.warn('⚠️ No OpenAI API key set — returning mock data.');
    return res.status(200).json({
      threadId: `mock-${Date.now()}`,
      initialMessage: `👋 Hello ${username}, I’m your freediving AI coach. Ask me anything about EQ, breathwork, or training!`,
    });
  }

  try {
    console.log(`📩 Creating OpenAI thread for user: ${username}`);

    // Step 1: Create a real thread
    const thread = await openai.beta.threads.create();

    // Step 2: Send initial message
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `Hi, I'm ${username}. Let's begin a freediving conversation.`,
    });

    // Step 3: Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    // Step 4: Poll for run completion
    let status = run.status;
    let retries = 0;

    while (status !== 'completed' && retries < 10) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const check = await openai.beta.threads.runs.retrieve({
        thread_id: thread.id,
        run_id: run.id,
      });
      status = check.status;
      retries++;
    }

    if (status !== 'completed') {
      throw new Error('Run did not complete in time.');
    }

    // Step 5: Retrieve the assistant's message
    const messages = await openai.beta.threads.messages.list(thread.id);
    const last = messages.data.find((m) => m.role === 'assistant');

    const textBlock = (last?.content || []).find((c) => {
      return (c as any)?.type === 'text' && (c as any)?.text?.value;
    }) as any;

    const reply = textBlock?.text?.value || "👋 Let's begin!";

    return res.status(200).json({
      threadId: thread.id,
      initialMessage: reply,
    });
  } catch (err: any) {
    console.error('❌ Assistant thread error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to create assistant thread' });
  }
}
