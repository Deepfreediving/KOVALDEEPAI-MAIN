import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username } = req.body;

  // Validate username
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required and must be a string' });
  }

  console.log('Creating thread for:', username);

  // Fallback: return mock data if no API key is set (dev mode)
  if (!OPENAI_API_KEY) {
    console.warn('No API key set. Returning mock thread.');
    return res.status(200).json({
      threadId: `mock-${Date.now()}`,
      initialMessage: `Welcome ${username}! This is a mock assistant response.`,
    });
  }

  try {
    // Call OpenAI API to simulate starting a conversation
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: `Hello, I’m ${username}. Let’s start a conversation!` }
        ],
        max_tokens: 150,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = response.data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error('No message returned from OpenAI');
    }

    return res.status(200).json({
      threadId: `thread-${Date.now()}`,
      initialMessage: reply,
    });

  } catch (err) {
    console.error('OpenAI error:', err);
    return res.status(500).json({
      error: 'Failed to create thread with OpenAI',
    });
  }
}
