import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Default OpenAI API base URL if none is provided
const OPENAI_API_URL = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";  

// Ensure the OpenAI API key is available in the environment variables
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key in environment variables.');
}

// Setup Axios for OpenAI API calls
const openaiApi = axios.create({
  baseURL: OPENAI_API_URL,  // Use the base URL only once
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,  // Authorization header with your API key
    'Content-Type': 'application/json',  // Ensure content type is correctly set for JSON
  },
});

// Function to create a new thread (or conversation) for the assistant
export const createThread = async () => {
  try {
    console.log("Creating thread...");

    // Send the request to OpenAI API to create a new thread (chat completion)
    const response = await openaiApi.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4',  // Default to GPT-4 if no model is specified in the environment
      messages: [
        { role: 'user', content: 'start conversation' },  // Start the conversation with a placeholder message
      ],
    });

    // Log the full response from OpenAI to check the structure
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

// Function to send a message to the assistant
export const createMessage = async (threadId, message) => {
  try {
    // Ensure threadId and message are provided
    if (!threadId || !message) {
      throw new Error("Missing required parameters: threadId or message");
    }

    // Fetch the file IDs
    const fileIds = await getFileIds();  // Fetch the file IDs
    console.log('File IDs:', fileIds);

    // Log the message being sent for debugging
    console.log('Sending message to OpenAI:', { threadId, message });

    // Send request to OpenAI API
    const response = await openaiApi.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
      // Attach files if available
      files: fileIds.length > 0 ? fileIds : undefined,  // Only include files if there are IDs
    });

    // Log the OpenAI API response for debugging
    console.log('OpenAI API Response:', response.data);

    // Ensure the response contains the expected data
    if (response.data && response.data.choices && response.data.choices.length > 0 && response.data.choices[0].message) {
      return response.data;
    } else {
      throw new Error('Invalid response structure from OpenAI API');
    }

  } catch (error) {
    console.error("Error sending message:", error.response?.data || error.message);
    throw new Error('Error sending message: ' + (error.message || error.response?.data?.error?.message || 'Unknown error'));
  }
};

// Function to list files uploaded to OpenAI and return their IDs
export const getFileIds = async () => {
  try {
    // Request to list files
    const response = await openaiApi.get('/files');
    console.log('Files in OpenAI system:', response.data); // Logs file details
    return response.data.data.map(file => file.id);  // Returns an array of file IDs
  } catch (error) {
    console.error('Error fetching file IDs:', error);
    return [];  // Return an empty array in case of error
  }
};

// Export axios instance for any other uses (if needed)
export default openaiApi;
