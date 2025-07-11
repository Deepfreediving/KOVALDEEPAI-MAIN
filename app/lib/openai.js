// /lib/openai.js or /services/openai.js

import { Configuration, OpenAIApi } from "openai";  // Corrected the import

// Initialize OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,  // Ensure OPENAI_API_KEY is set in your environment variables
});

const openai = new OpenAIApi(configuration);

// Function to call OpenAI's API for generating responses
export const getOpenAIResponse = async (message) => {
  try {
    // Make a request to OpenAI's API to get a response based on the message
    const response = await openai.createCompletion({
      model: "text-davinci-003",  // You can change the model if needed
      prompt: message,
      max_tokens: 100,  // Adjust this as needed
      temperature: 0.7, // Control randomness (0 to 1)
    });

    // Log the response for debugging
    console.log('OpenAI Response:', response.data.choices[0].text);

    // Return the assistant's response text
    return response.data.choices[0].text;
  } catch (error) {
    console.error("Error with OpenAI API call:", error);
    return null;
  }
};
