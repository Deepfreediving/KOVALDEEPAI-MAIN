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
    const response = await openaiApi.post('/threads', { model: process.env.OPENAI_MODEL });
    return response.data;
  } catch (error) {
    console.error("Error creating thread:", error);
    throw error;
  }
};

// Function to send a message to the assistant
export const createMessage = async (threadId, message) => {
  try {
    const response = await openaiApi.post(`/threads/${threadId}/messages`, {
      role: 'user',
      content: message,
    });
    return response.data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export default openaiApi;
