import { createMessage } from '@lib/openai';  // Importing function to interact with OpenAI

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { message, thread_id, username } = req.body;

      // Log received data for debugging
      console.log('Received from frontend:', { message, thread_id, username });

      // Validate required fields
      if (!message || !thread_id || !username) {
        return res.status(400).json({ error: 'Missing required fields: message, thread_id, or username' });
      }

      // Call the createMessage function to get a response from OpenAI
      const response = await createMessage(thread_id, message);

      // Log the response for debugging
      console.log('OpenAI Response:', response);

      if (!response || !response.choices || !response.choices[0]?.message) {
        return res.status(500).json({ error: 'Invalid response from OpenAI' });
      }

      const assistantMessage = response.choices[0].message;

      // Send the assistant's message back to the frontend
      return res.status(200).json({ assistantMessage });
    } catch (error) {
      console.error('Error in /api/chat:', error.message);
      return res.status(500).json({ error: `Internal error: ${error.message || 'An unknown error occurred'}` });
    }
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}