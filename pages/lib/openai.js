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
    // Simulate hardcoded data for thread creation
    const response = {
      data: {
        threadId: 'test-thread-id-12345',
        model: process.env.OPENAI_MODEL,
        status: 'success',
        message: 'Thread created successfully'
      }
    };
    
    // Return the hardcoded response data
    console.log('Thread Created:', response.data);
    return response.data;
  } catch (error) {
    // If the error is from the API response, log detailed response data
    console.error("Error creating thread:", error.response?.data || error.message);
    throw error;
  }
};

// Function to send a message to the assistant
export const createMessage = async (threadId, message) => {
  try {
    // Test with hardcoded data if no actual request is made
    if (process.env.NODE_ENV === 'development') {
      console.log("Test Mode: Using hardcoded data for message response.");
      
      const hardcodedResponse = {
        role: 'assistant',
        content: 'This is a simulated assistant response for testing purposes.',
        threadId: threadId,
      };
      
      // Return hardcoded data in place of actual API response
      return { choices: [{ message: hardcodedResponse }] };
    }

    // Check if threadId or message is missing
    if (!threadId || !message) {
      throw new Error("Missing required parameters: threadId or message");
    }

    const response = await openaiApi.post(`/threads/${threadId}/messages`, {
      role: 'user', // User's message
      content: message, // The actual message content
    });

    return response.data;
  } catch (error) {
    // Improved error handling
    if (error.response) {
      // If the error is from the API response, log detailed response data
      console.error("Error sending message:", error.response.data);
    } else {
      // If no response, log the error message
      console.error("Error sending message:", error.message);
    }
    throw new Error('Error sending message: ' + (error.message || error.response?.data));
  }
};

// Export axios instance for any other uses
export default openaiApi;
