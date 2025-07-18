const { OpenAI } = require("openai");

// Create a new instance of OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Function to get embeddings for a given text using OpenAI's model.
 * @param {string} text - The text to generate embeddings for.
 * @returns {Promise<Array>} - A Promise that resolves to the embedding array.
 */
async function getEmbedding(text) {
  try {
    // Ensure text is provided
    if (!text || typeof text !== "string") {
      throw new Error("Invalid input: text is required and must be a string.");
    }

    // Request embeddings from OpenAI API
    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002", // Model used for generating embeddings
      input: text,
    });

    // Validate the response structure to ensure expected data
    if (
      !response ||
      !response.data ||
      !response.data[0] ||
      !response.data[0].embedding
    ) {
      throw new Error(
        "Invalid response from OpenAI API: embedding data missing.",
      );
    }

    // Return the embeddings data
    return response.data[0].embedding;
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error generating embedding:", error.message);
    throw error; // Re-throw the error after logging it
  }
}

module.exports = getEmbedding;
