import axios from "axios";
import "dotenv/config";

/**
 * ✅ Validate required environment variables
 */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID; // Must be set in .env

if (!OPENAI_API_KEY) {
  throw new Error("❌ Missing OpenAI API key in environment variables.");
}
if (!OPENAI_ASSISTANT_ID) {
  console.warn(
    "⚠️ Warning: Missing ASSISTANT ID. Some functions may not work as expected.",
  );
}

/**
 * ✅ Setup Axios for OpenAI API calls
 */
const openaiApi = axios.create({
  baseURL: process.env.OPENAI_API_URL || "https://api.openai.com/v1",
  headers: {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": "assistants=v2", // Required for Assistants API v2
  },
});

/**
 * ✅ Create a new thread for a user session
 * @param {string} username - Identifier for the user
 * @returns {Promise<string>} Thread ID
 */
export const createThread = async (username = "anonymous") => {
  try {
    console.log(`🧵 Creating thread for user: ${username}`);

    const response = await openaiApi.post("/threads", {
      metadata: { username },
    });

    if (!response.data?.id) {
      throw new Error("❌ No threadId returned from OpenAI API.");
    }

    return response.data.id;
  } catch (error) {
    console.error(
      "❌ Error creating thread:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * ✅ Send a message to an assistant within a thread
 * @param {string} threadId - The OpenAI thread ID
 * @param {string} message - The user's message
 * @returns {Promise<string>} Assistant response text
 */
export const createMessage = async (threadId, message) => {
  try {
    if (!threadId) throw new Error("❌ Missing threadId.");
    if (!message) throw new Error("❌ Message content cannot be empty.");

    console.log(`✉️ Sending message to thread ${threadId}:`, message);

    // 1️⃣ Add message to thread
    await openaiApi.post(`/threads/${threadId}/messages`, {
      role: "user",
      content: message,
    });

    // 2️⃣ Create a run for the assistant to process messages
    const runResponse = await openaiApi.post(`/threads/${threadId}/runs`, {
      assistant_id: OPENAI_ASSISTANT_ID,
    });

    const runId = runResponse.data.id;

    // 3️⃣ Poll for completion
    let status = "in_progress";
    let assistantMessage = "";

    while (status === "in_progress" || status === "queued") {
      await new Promise((res) => setTimeout(res, 1500)); // Wait 1.5s
      const check = await openaiApi.get(`/threads/${threadId}/runs/${runId}`);
      status = check.data.status;
    }

    if (status === "completed") {
      // Get all messages from thread
      const messages = await openaiApi.get(`/threads/${threadId}/messages`);
      const assistantResponse = messages.data.data.find(
        (msg) => msg.role === "assistant",
      );

      assistantMessage =
        assistantResponse?.content[0]?.text?.value ||
        "⚠️ No response content found.";
    } else {
      throw new Error(`Run failed with status: ${status}`);
    }

    return assistantMessage;
  } catch (error) {
    console.error(
      "❌ Error sending message:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * ✅ List all files uploaded to OpenAI
 * @returns {Promise<string[]>} Array of file IDs
 */
export const getFileIds = async () => {
  try {
    const response = await openaiApi.get("/files");
    return response.data.data?.map((file) => file.id) || [];
  } catch (error) {
    console.error("❌ Error fetching file IDs:", error.message);
    return [];
  }
};

export default openaiApi;
