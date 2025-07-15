import { createThread } from '@lib/openai';  // Importing createThread from @lib/openai

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      console.log('Creating thread...');
      
      // Call the createThread function from @lib/openai
      const data = await createThread();
      
      // Log the response for debugging purposes
      console.log('Thread creation response:', data);
      
      // Ensure that threadId is returned in the response
      if (!data || !data.threadId) {
        const errorMessage = 'Thread creation failed: No threadId returned.';
        console.error(errorMessage);
        throw new Error(errorMessage);  // Throwing the error with a descriptive message
      }
      
      // Return the threadId to the client
      res.status(200).json({ threadId: data.threadId });
    } catch (error) {
      // Log the error message for debugging
      console.error('Error creating thread:', error.message || error);
      
      // Return an error response with status 500 if something went wrong
      res.status(500).json({ error: 'Failed to create thread: ' + (error.message || error) });
    }
  } else {
    // Return a 405 error if the method is not POST
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
