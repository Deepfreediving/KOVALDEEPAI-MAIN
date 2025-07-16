export const createThread = async () => {
  try {
    console.log("Creating thread...");

    // Log environment and request parameters
    console.log("OpenAI API Key:", process.env.OPENAI_API_KEY);
    console.log("Model:", process.env.OPENAI_MODEL);

    // Send the request to OpenAI API to create a new thread (chat completion)
    const response = await openaiApi.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4',  // Default to GPT-4 if no model is specified in the environment
      messages: [
        { role: 'user', content: 'start conversation' },  // Start the conversation with a placeholder message
      ],
    });

    console.log('Thread Creation Response:', response.data); // Log the full response to see if threadId is returned

    // Ensure the response contains a valid threadId (completion ID)
    if (!response.data || !response.data.id) {
      const errorMessage = 'Thread creation failed: No threadId returned from OpenAI API.';
      console.error(errorMessage);
      throw new Error(errorMessage);  // Throwing the error with a descriptive message
    }

    // Return the threadId from the response
    return { threadId: response.data.id };  // Return the completion ID as the thread identifier
  } catch (error) {
    // Log the error message for debugging
    console.error('Error creating thread:', error.message || error);
    throw new Error('Error creating thread: ' + (error.message || error.response?.data?.error?.message || 'Unknown error'));
  }
};
