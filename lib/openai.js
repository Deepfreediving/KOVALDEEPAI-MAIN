import axios from "axios";

// Load environment variables
if (typeof window === "undefined") {
  require("dotenv").config(); // Load .env only in the server-side environment (Next.js)
}

// Default OpenAI API base URL if none is provided
const OPENAI_API_URL =
  process.env.OPENAI_API_URL || "https://api.openai.com/v1";

// Ensure the OpenAI API key is available in the environment variables
if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OpenAI API key in environment variables.");
}

// Setup Axios for OpenAI API calls
const openaiApi = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // Authorization header with your API key
    "Content-Type": "application/json", // Ensure content type is correctly set for JSON
  },
});

// Function to create a new thread (or conversation) for the assistant
export const createThread = async (username) => {
  try {
    console.log("Creating thread for user:", username);

    // Send the request to OpenAI API to create a new thread (chat completion)
    const response = await openaiApi.post("/chat/completions", {
      model: process.env.OPENAI_MODEL || "gpt-4", // Use the model from .env or default to 'gpt-4o'
      messages: [{ role: "user", content: "start conversation" }],
    });

    // Check for successful response and thread ID
    if (!response.data || !response.data.id) {
      throw new Error("No threadId returned from OpenAI API");
    }

    return { threadId: response.data.id }; // Return thread ID
  } catch (error) {
    console.error("Error creating thread:", error.message);
    throw new Error("Error creating thread: " + error.message); // Error handling
  }
};

// Function to send a message to the assistant
export const createMessage = async (threadId, message) => {
  try {
    // Ensure threadId and message are provided
    if (!threadId || !message) {
      throw new Error("Missing required parameters: threadId or message");
    }

    // Fetch the file IDs (if applicable)
    const fileIds = await getFileIds(); // Fetch the file IDs if any
    console.log("File IDs:", fileIds);

    // Log the message being sent for debugging
    console.log("Sending message to OpenAI:", { threadId, message });

    // Send request to OpenAI API to continue the conversation
    const response = await openaiApi.post("/chat/completions", {
      model: process.env.OPENAI_MODEL || "gpt-4", // Use the model from .env
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
      files: fileIds.length > 0 ? fileIds : undefined, // Only include files if there are IDs
    });

    // Log the OpenAI API response for debugging
    console.log("OpenAI API Response:", response.data);

    // Ensure the response contains the expected data
    if (
      response.data &&
      response.data.choices &&
      response.data.choices.length > 0 &&
      response.data.choices[0].message
    ) {
      return response.data;
    } else {
      throw new Error("Invalid response structure from OpenAI API");
    }
  } catch (error) {
    console.error(
      "Error sending message:",
      error.response?.data || error.message,
    );
    throw new Error(
      "Error sending message: " +
        (error.message ||
          error.response?.data?.error?.message ||
          "Unknown error"),
    );
  }
};

// Function to list files uploaded to OpenAI and return their IDs
export const getFileIds = async () => {
  try {
    // Request to list files uploaded to OpenAI
    const response = await openaiApi.get("/files");
    console.log("Files in OpenAI system:", response.data); // Logs file details

    // If files are returned, map and return their IDs
    return response.data.data ? response.data.data.map((file) => file.id) : [];
  } catch (error) {
    console.error("Error fetching file IDs:", error.message || error);
    return []; // Return an empty array in case of error
  }
};

// Export axios instance for any other uses (if needed)
export default openaiApi;
