import { createMessage } from '@lib/openai';  // Importing function to interact with OpenAI

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { message, thread_id, username } = req.body;  // Receive the message, thread_id, and username

      // Validate required parameters
      if (!message || !thread_id || !username) {
        return res.status(400).json({ error: 'Missing required fields: message, thread_id, or username' });
      }

      // Call createMessage function to send the message to OpenAI
      const response = await createMessage(thread_id, message);

      // Assuming the response has a message field from the assistant
      const assistantMessage = response?.choices?.[0]?.message || { role: 'assistant', content: 'Error: No response from assistant.' };

      // Return the assistant's response
      res.status(200).json({ assistantMessage });

    } catch (error) {
      console.error('Error in /api/chat:', error.message || error.response?.data);
      res.status(500).json({ error: 'Internal Server Error: ' + error.message });
    }
  } else {
    // Method not allowed for other HTTP methods
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
