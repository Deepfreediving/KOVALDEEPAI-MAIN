export const createThread = async () => {
  try {
    const response = await openaiApi.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4o',  // Default model set to GPT-4o if not provided in the environment
      messages: [
        { role: 'user', content: 'start' },  // Start the conversation with a placeholder message
      ],
    });

    // Log the entire response for debugging
    console.log('Thread Creation Response:', response.data);

    // Check if threadId exists in response
    if (!response.data || !response.data.id) {
      throw new Error('No threadId returned from OpenAI.');
    }

    // Return the threadId from the response
    return { threadId: response.data.id };

  } catch (error) {
    // Enhanced error logging
    console.error("Error creating thread:", error.response?.data || error.message);
    throw new Error('Error creating thread: ' + (error.message || error.response?.data));
  }
};
