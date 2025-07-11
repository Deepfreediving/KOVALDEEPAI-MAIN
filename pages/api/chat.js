// pages/api/chat.js
import { createMessage } from '@lib/openai';  // Import the function to interact with OpenAI

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { message, thread_id } = req.body; // Extract message and thread_id from the request body
      if (!thread_id) {
        return res.status(400).json({ error: 'Thread ID is required' }); // Ensure thread ID is provided
      }
      
      // Send the message to OpenAI using your utility function
      const response = await createMessage(thread_id, message);
      
      // Return the assistant's response back to the frontend
      res.status(200).json({ assistantMessage: response });
    } catch (error) {
      console.error('Error processing message:', error);
      res.status(500).json({ error: 'Error processing message' });
    }
  } else {
    // Handle unsupported HTTP methods
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
