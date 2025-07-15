import { createThread } from '../../lib/openai';  // Import createThread from openai.js
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY);
console.log("OPENAI_MODEL:", process.env.OPENAI_MODEL);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      console.log('Creating thread...');

      // Call the createThread function
      const data = await createThread();  // Use the already defined function

      // Log the response for debugging
      console.log('Thread creation response:', data);

      // Ensure that threadId is returned in the response
      if (!data || !data.threadId) {
        const errorMessage = 'Thread creation failed: No threadId returned.';
        console.error(errorMessage);
        return res.status(500).json({ error: errorMessage });  // Return a structured error response
      }

      // Return the threadId to the client
      return res.status(200).json({ threadId: data.threadId });

    } catch (error) {
      // Log the error message for debugging
      console.error('Error creating thread:', error.message || error);

      // Return an error response with status 500 if something went wrong
      return res.status(500).json({ error: 'Failed to create thread: ' + (error.message || error) });
    }
  } else {
    // Return a 405 error if the method is not POST
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}
