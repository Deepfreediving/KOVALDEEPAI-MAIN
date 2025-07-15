import axios from 'axios';

// Ensure that OPENAI_API_URL is only assigned once
const OPENAI_API_URL = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";  // Use the base URL defined in your environment

// Setup Axios for OpenAI API calls
const openaiApi = axios.create({
  baseURL: OPENAI_API_URL,  // Use the base URL once
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,  // Use the OpenAI API key from the environment
    'Content-Type': 'application/json',
  },
});

// Function to create a new thread (or conversation) for the assistant
export const createThread = async () => {
  try {
    const response = await openaiApi.post('/chat/completions', {
      model: process.env.OPENAI_MODEL,  // Ensure this is correctly set in your environment
      messages: [
        { role: 'user', content: 'start' },  // Start the conversation with a placeholder message
      ],
    });

    // Log the response for debugging
    console.log('Thread Creation Response:', response.data);

    // Return the thread ID from the response (now response.data.id)
    return { threadId: response.data.id };  // Use the completion ID as a thread identifier
  } catch (error) {
    console.error("Error creating thread:", error.response?.data || error.message);
    throw error;  // Rethrow the error for proper handling
  }
};

// Function to send a message to the assistant
export const createMessage = async (threadId, message) => {
  try {
    // Ensure threadId and message are provided
    if (!threadId || !message) {
      throw new Error("Missing required parameters: threadId or message");
    }

    // Log the message being sent for debugging
    console.log('Sending message to OpenAI:', { threadId, message });

    // Send request to OpenAI API
    const response = await openaiApi.post('/chat/completions', {
      model: process.env.OPENAI_MODEL,  // Ensure this is set correctly to GPT-4o
      messages: [
        {
          role: 'user',  // User's message role
          content: message,  // The message content
        },
      ],
    });

    // Log the OpenAI API response for debugging
    console.log('OpenAI API Response:', response.data);

    // Ensure the response contains the expected data
    if (response.data && response.data.choices && response.data.choices[0].message) {
      // Return the assistant's message
      return response.data;
    } else {
      throw new Error('Invalid response structure from OpenAI API');
    }

  } catch (error) {
    // Improved error handling for both the API response and the general message
    console.error("Error sending message:", error.response?.data || error.message);
    throw new Error('Error sending message: ' + (error.message || error.response?.data));
  }
};

// Export axios instance for any other uses (if needed)
export default openaiApi;
