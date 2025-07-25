import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * API Route: /api/create-thread
 * Creates a mock or real assistant thread using OpenAI API (chat-based).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username } = req.body;

  // ✅ Validate username
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required and must be a string' });
  }

  console.log('📩 Creating thread for user:', username);

  // ✅ Dev Mode: Fallback if no API key
  if (!OPENAI_API_KEY) {
    console.warn('⚠️ No OpenAI API key set — returning mock data.');
    return res.status(200).json({
      threadId: `mock-${Date.now()}`,
      initialMessage: `👋 Hello ${username}, I’m your freediving AI coach. Ask me anything about EQ, breathwork, or training!`,
    });
  }

  try {
    // ✅ Call OpenAI chat completion API (acts like a warm-up chat)
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a friendly freediving coach AI. Answer clearly, ask 1 question at a time, and provide helpful guidance.',
          },
          {
            role: 'user',
            content: `Hi, I'm ${username}. Let's begin a freediving conversation.`,
          }
        ],
        temperature: 0.6,
        max_tokens: 150,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = response?.data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error('No message returned from OpenAI.');
    }

    if (process.env.NODE_ENV === 'development') {
      console.log("🧠 OpenAI raw response:", JSON.stringify(response.data, null, 2));
    }

    // ✅ Return simulated thread ID and initial message
    return res.status(200).json({
      threadId: `thread-${Date.now()}`,
      initialMessage: reply,
    });
  } catch (err: any) {
    console.error('❌ OpenAI error:', err?.response?.data || err.message || err);
    return res.status(500).json({
      error: 'Failed to create thread with OpenAI',
    });
  }
}
