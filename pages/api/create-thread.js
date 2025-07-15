import openaiApi, { createThread } from '../../lib/openai'; // Ensure you import the axios instance properly

export const createThread = async () => {
  try {
    console.log("Creating thread...");

    // Send the request to OpenAI API to create a new thread (chat completion)
    const response = await openaiApi.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4',  // Default to GPT-4 if no model is specified in the environment
      messages: [
        { role: 'user', content: 'start' },  // Starting the conversation with a placeholder message
      ],
    });

    // Log the full response from OpenAI to check the structure
    console.log('Full OpenAI API Response:', response);

    // Ensure the response contains a valid threadId (completion ID)
    if (!response.data || !response.data.id) {
      const errorMessage = 'Thread creation failed: No threadId returned from OpenAI API.';
      console.error(errorMessage);
      throw new Error(errorMessage);  // Throwing the error with a descriptive message
    }

    // Return the threadId from the response
    return { threadId: response.data.id };

  } catch (error) {
    // Log the error with more details for debugging
    console.error("Error creating thread:", error.response?.data || error.message);

    // Return a custom error message or throw depending on your error-handling strategy
    throw new Error('Error creating thread: ' + (error.message || error.response?.data?.error?.message || 'Unknown error'));
  }
};
