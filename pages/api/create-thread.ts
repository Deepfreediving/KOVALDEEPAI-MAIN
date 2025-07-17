import { NextApiRequest, NextApiResponse } from 'next'; // Import Next.js API types
import axios from 'axios'; // Import axios for making HTTP requests

// Ensure environment variables are loaded properly
const OPENAI_SECRET_KEY = process.env.OPENAI_SECRET_KEY; // OpenAI Secret Key from env

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Log the incoming request for debugging
  console.log("Received request:", req.method, req.body);

  // Ensure it's a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract API key from headers
  const apiKey = req.headers['x-api-key'];

  // Ensure apiKey is a string before using it
  if (typeof apiKey !== 'string') {
    return res.status(403).json({ error: 'API key is missing or invalid' });
  }

  console.log('Validating API key...');
  // Here you could add the logic for API key validation if needed
  // Since we're assuming the API key is valid for now, we skip validation logic

  const { username } = req.body;

  // Ensure username is a string before using it
  if (typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required and must be a string' });
  }

  console.log('Creating thread for username:', username);

  try {
    // Prepare data for OpenAI API request
    const data = {
      model: 'gpt-4',  // Using GPT-4 model
      messages: [{ role: 'system', content: `You are a helpful assistant.` }, { role: 'user', content: `Hello, I’m ${username}. Let’s start a conversation!`}], // Sending initial messages
      max_tokens: 150,
      temperature: 0.7,
    };

    console.log('Making request to OpenAI...');
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',  // Correct OpenAI chat completions endpoint
      data,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('OpenAI response received:', response.data);

    // Check if OpenAI returned a valid response
    if (!response.data || !response.data.choices || response.data.choices.length === 0) {
      throw new Error('Invalid response from OpenAI API');
    }

    const threadId = Date.now().toString(); // Generate a unique thread ID based on the current timestamp

    // Return the thread ID and the initial message from OpenAI
    return res.status(200).json({
      threadId,
      initialMessage: response.data.choices[0].message.content.trim(), // Correct access to message content in OpenAI response
    });
  } catch (error) {
    console.error('Error with OpenAI request:', error);
    return res.status(500).json({ error: 'Error creating thread: '  });
  }
}
