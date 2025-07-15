import { createMessage } from '../../lib/openai';  // Importing function to interact with OpenAI

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { message, thread_id, username } = req.body;  // Receive the message, thread_id, and username

      // Log the received data for debugging
      console.log("Received from frontend:", { message, thread_id, username });

      // Validate required parameters
      if (!message || !thread_id || !username) {
        return res.status(400).json({ error: 'Missing required fields: message, thread_id, or username' });
      }

      // Call createMessage function to send the message to OpenAI
      const response = await createMessage(thread_id, message);

      // Log the response from OpenAI for debugging
      console.log("OpenAI Response:", response);

      // Ensure that response contains choices and message
      if (!response || !response.choices || !response.choices[0]?.message) {
        console.error('Error: No valid response from OpenAI.');
        return res.status(500).json({ error: 'Error: No valid response from OpenAI.' });
      }

      // Assuming the response has a message field from the assistant
      const assistantMessage = response?.choices?.[0]?.message || { role: 'assistant', content: '⚠️ No response from assistant. Please try again.' };

      // Return the assistant's response
      return res.status(200).json({ assistantMessage });

    } catch (error) {
      // Log the error message for debugging
      console.error('Error in /api/chat:', error.message || error);

      // Return an error response with status 500 if something went wrong
      return res.status(500).json({
        error: 'Internal Server Error: Unable to fetch assistant response. Please check the OpenAI API or service.'
      });
    }
  } else {
    // Return a 405 error if the method is not POST
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}
