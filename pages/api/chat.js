import { createMessage } from "@lib/openai"; // Importing function to interact with OpenAI

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { message, thread_id, username } = req.body;

      // Log received data for debugging
      console.log("Received from frontend:", { message, thread_id, username });

      // Validate required fields
      if (!message || !thread_id || !username) {
        console.error(
          "Missing required fields: message, thread_id, or username",
        );
        return res.status(400).json({
          error: "Missing required fields: message, thread_id, or username",
        });
      }

      // Call the createMessage function to get a response from OpenAI
      const response = await createMessage(thread_id, message);

      // Log the response for debugging
      console.log("OpenAI Response:", response);

      // Ensure the response has a valid structure from OpenAI
      if (
        !response ||
        !response.choices ||
        response.choices.length === 0 ||
        !response.choices[0]?.message
      ) {
        console.error("Invalid response structure from OpenAI");
        return res.status(500).json({
          error: "Invalid response from OpenAI: Missing choices or message",
        });
      }

      const assistantMessage = response.choices[0].message;

      // Send the assistant's message back to the frontend
      return res.status(200).json({ assistantMessage });
    } catch (error) {
      // Improved error logging with more context
      console.error("Error in /api/chat:", error.message, error.stack);
      return res.status(500).json({
        error: `Internal error: ${error.message || "An unknown error occurred"}`,
      });
    }
  } else {
    // Handle unsupported methods
    console.warn("Method Not Allowed:", req.method);
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
