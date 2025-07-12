// pages/api/chat.js

import { createMessage } from '@lib/openai';  // Import the function to interact with OpenAI

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { message, thread_id, username } = req.body;  // Extract message, thread_id, and username from the request body

      // Check if thread_id, message, and username are provided
      if (!thread_id) {
        return res.status(400).json({ error: 'Thread ID is required' });
      }
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      // Send the message to OpenAI using the createMessage function
      const response = await createMessage(thread_id, message, username);

      // Check if the response contains valid assistant data
      if (!response || !response.choices || response.choices.length === 0) {
        return res.status(500).json({ error: 'No valid response from assistant' });
      }

      // Return the assistant's response back to the frontend
      res.status(200).json({ assistantMessage: response.choices[0].message });

    } catch (error) {
      console.error('Error processing message:', error);
      res.status(500).json({ error: `Error processing message: ${error.message}` });  // Improved error handling
    }
  } else {
    // Handle unsupported HTTP methods
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
