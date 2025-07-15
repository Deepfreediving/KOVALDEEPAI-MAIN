import { createThread } from '../../lib/openai';  // Import createThread from openai.js

// Log environment variables for debugging purposes (use cautiously, avoid logging sensitive info in production)
if (process.env.OPENAI_API_KEY) {
  console.log("OPENAI_API_KEY is set.");
} else {
  console.warn("OPENAI_API_KEY is not defined.");
}

if (process.env.OPENAI_MODEL) {
  console.log("OPENAI_MODEL is set.");
} else {
  console.warn("OPENAI_MODEL is not defined.");
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      console.log('Creating thread...');

      // Call the createThread function to initiate a thread
      const data = await createThread();  // Use the already defined function to create a thread

      // Log the response for debugging
      console.log('Thread creation response:', data);

      // Ensure that threadId is returned in the response
      if (!data || !data.threadId) {
        const errorMessage = 'Thread creation failed: No threadId returned from OpenAI.';
        console.error(errorMessage);
        return res.status(500).json({ error: errorMessage });
      }

      // Return the threadId to the client
      return res.status(200).json({ threadId: data.threadId });

    } catch (error) {
      // Log the error for better debugging
      console.error('Error creating thread:', error.message || error);

      // Return a custom error response with status 500 if something went wrong
      return res.status(500).json({
        error: `Failed to create thread: ${error.message || 'Unknown error occurred'}`
      });
    }
  } else {
    // Return 405 Method Not Allowed if the HTTP method is not POST
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}
