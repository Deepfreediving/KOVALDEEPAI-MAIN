// lib/openai.js
import axios from 'axios';

// Define the OpenAI base URL (with fallback if not provided in environment variables)
const OPENAI_API_URL = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";

// Create an Axios instance for making API calls to OpenAI
const openaiApi = axios.create({
  baseURL: OPENAI_API_URL,
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Authorization using the OpenAI API key
    'Content-Type': 'application/json', // Set content type to JSON
  },
});

// Function to create a new thread (conversation) for the assistant
export const createThread = async () => {
  try {
    const response = await openaiApi.post('/threads', {
      model: process.env.OPENAI_MODEL || 'gpt-4', // Default to GPT-4 if not defined
    });
    return response.data; // Return the thread data
  } catch (error) {
    console.error("Error creating thread:", error);
    throw new Error('Error creating thread: ' + error.message); // Better error message
  }
};

// Function to send a message to the assistant
export const createMessage = async (threadId, message) => {
  try {
    const response = await openaiApi.post(`/threads/${threadId}/messages`, {
      role: 'user', // User's message
      content: message, // The actual message content
    });
    return response.data; // Return the response from OpenAI
  } catch (error) {
    console.error("Error sending message:", error);
    throw new Error('Error sending message: ' + error.message); // Improved error message
  }
};

// Exporting the Axios instance if needed for other uses
export default openaiApi;
