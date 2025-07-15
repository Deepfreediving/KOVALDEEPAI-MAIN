import { openaiApi } from './openaiApi'; // Ensure you import the axios instance properly

export const createThread = async () => {
  try {
    console.log("Creating thread...");

    // Send the request to OpenAI API to create a new thread
    const response = await openaiApi.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4o',  // Default model if none is provided
      messages: [
        { role: 'user', content: 'start' },  // Starting the conversation with a placeholder message
      ],
    });

    // Log the full response from OpenAI to check the structure
    console.log('Full OpenAI API Response:', response);

    // Check if the threadId is in the response
    if (!response.data || !response.data.id) {
      throw new Error('No threadId returned from OpenAI API.');
    }

    // Return the threadId
    return { threadId: response.data.id };
    
  } catch (error) {
    // Log the error with more details for debugging
    console.error("Error creating thread:", error.response?.data || error.message);

    // Return a custom error message or throw depending on your error-handling strategy
    throw new Error('Error creating thread: ' + (error.message || error.response?.data?.error?.message || 'Unknown error'));
  }
};
