/* eslint-disable no-unused-vars */
export default async function handler(req, res) {
  if (require('@/utils/cors').default(req, res)) return;
  // Check if the OpenAI API key is missing or empty from environment variables
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === "") {
    return res.status(500).json({ error: "OPENAI_API_KEY is missing or empty" });
  }
  try {
    // Make a POST request to the correct OpenAI endpoint
    const response = await fetch("https://api.openai.com/v1/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-davinci-003", // Replace with the model you want to use
        prompt: "Say this is a test",
        max_tokens: 7,
      }),
    });

    // Check if the response status is ok (2xx)
    if (!response.ok) {
      const errorResponse = await response.json(); // Get error details from OpenAI response
      return res.status(response.status).json({ error: errorResponse.error || "Failed to fetch data from OpenAI" });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ error: "API request failed", message: error.message });
  }
}
