import axios from 'axios';

// Define the OpenAI base URL
const OPENAI_API_URL = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";  // Use the base URL defined in your environment

// Setup Axios for OpenAI API calls
const openaiApi = axios.create({
  baseURL: OPENAI_API_URL,
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,  // Use the OpenAI API key from the environment
    'Content-Type': 'application/json',
  },
});

// Function to create a new thread (or conversation) for the assistant
export const createThread = async () => {
  try {
    // If in development, return hardcoded data for testing purposes
    if (process.env.NODE_ENV === 'development') {
      console.log("Test Mode: Using hardcoded data for thread creation.");
      return {
        threadId: 'test-thread-id-12345',  // Hardcoded thread ID for testing
        model: process.env.OPENAI_MODEL,   // Ensure this is set correctly in your environment
        status: 'success',
        message: 'Thread created successfully'
      };
    }

    // In production, create the thread via the OpenAI API
    const response = await openaiApi.post('/chat/completions', {  // Use the appropriate endpoint
      model: process.env.OPENAI_MODEL,  // Ensure this is set correctly in your environment
    });

    return response.data;  // Assuming the response contains the thread ID in the 'id' field
  } catch (error) {
    console.error("Error creating thread:", error.response?.data || error.message);
    throw error;  // Rethrow the error for proper handling
  }
};

// Function to send a message to the assistant
export const createMessage = async (threadId, message) => {
  try {
    // If in development, return a hardcoded response for testing purposes
    if (process.env.NODE_ENV === 'development') {
      console.log("Test Mode: Using hardcoded data for message response.");
      return { 
        choices: [{
          message: {
            role: 'assistant',
            content: 'This is a simulated assistant response for testing purposes.',
            threadId: threadId,
          }
        }] 
      };
    }

    // Ensure threadId and message are provided
    if (!threadId || !message) {
      throw new Error("Missing required parameters: threadId or message");
    }

    // In production, send the message to the OpenAI API
    const response = await openaiApi.post('/chat/completions', {
      model: process.env.OPENAI_MODEL,  // Ensure this is set correctly in your environment
      messages: [
        {
          role: 'user',  // User's message role
          content: message,  // The message content
        },
      ],
    });

    return response.data;  // Return the real response from the API
  } catch (error) {
    // Improved error handling for both the API response and the general message
    console.error("Error sending message:", error.response?.data || error.message);
    throw new Error('Error sending message: ' + (error.message || error.response?.data));
  }
};

// Export axios instance for any other uses (if needed)
export default openaiApi;
