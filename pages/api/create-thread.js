import { openaiApi } from '@lib/openai';  // Assuming @lib/openai exports an axios instance configured for OpenAI

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const response = await openaiApi.post('/threads', {
        model: process.env.OPENAI_MODEL,
      });

      const threadId = response.data.id;  // Assuming the API returns an ID for the thread
      res.status(200).json({ threadId });
    } catch (error) {
      console.error('Error creating thread:', error);
      res.status(500).json({ error: 'Failed to create thread' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
