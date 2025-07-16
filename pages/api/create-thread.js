import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Setup Axios for OpenAI API calls
const openaiApi = axios.create({
  baseURL: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',  // Default to OpenAI API base URL
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,  // Authorization header with your API key
    'Content-Type': 'application/json',  // Ensure content type is correctly set for JSON
  },
});

// Function to create a new thread (or conversation) for the assistant
export const createThread = async () => {
  try {
    console.log("Creating thread...");

    // Log environment and request parameters
    console.log("OpenAI API Key:", process.env.OPENAI_API_KEY);  // Debugging: Log the API key
    console.log("Model:", process.env.OPENAI_MODEL);  // Debugging: Log the model being used

    // Send the request to OpenAI API to create a new thread (chat completion)
    const response = await openaiApi.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4',  // Default to GPT-4 if no model is specified in the environment
      messages: [
        { role: 'user', content: 'start conversation' },  // Start the conversation with a placeholder message
      ],
    });

    // Log the full response to see if threadId is returned
    console.log('Thread Creation Response:', response.data);

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

    // Return a custom error message or throw depending on your error-handling strategy
    throw new Error('Error creating thread: ' + (error.message || error.response?.data?.error?.message || 'Unknown error'));
  }
};
