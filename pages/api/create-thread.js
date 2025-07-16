import { createThread } from '@lib/openai';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Attempt to create the thread
      const threadResponse = await createThread();

      // Ensure threadId is returned from the createThread function
      if (!threadResponse || !threadResponse.threadId) {
        console.error('Thread creation failed: No threadId returned.');
        return res.status(500).json({ error: 'Thread creation failed, no threadId returned.' });
      }

      // Return the threadId
      return res.status(200).json({ threadId: threadResponse.threadId });
    } catch (error) {
      // Log the full error including message and stack trace for better debugging
      console.error('Error creating thread:', error.message, error.stack);

      // Return a detailed error message to the frontend
      return res.status(500).json({ error: `Internal error: ${error.message || 'Unknown error'}` });
    }
  } else {
    // If not a POST request, return Method Not Allowed
    console.warn('Invalid method used. Only POST requests are allowed.');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}
