import { NextApiRequest, NextApiResponse } from 'next'; // Import Next.js API types
import bcrypt from 'bcryptjs'; // Import bcryptjs for API key validation
import axios from 'axios'; // Import axios for making HTTP requests

// Ensure environment variables are loaded properly
const API_KEY_HASH = process.env.API_KEY_HASH; // Pre-hashed API key in env
const OPENAI_SECRET_KEY = process.env.OPENAI_SECRET_KEY; // OpenAI Secret Key from env

type RequestBody = {
  username: string; // Expecting `username` in the request body
};

type ResponseData = {
  threadId: string;
  initialMessage: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | { error: string }>
) {
  // Ensure it's a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // API Key Validation
  const apiKey = req.headers['x-api-key']; // This is string | undefined

  // Early return if apiKey is undefined or not a string
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(403).json({ error: 'Forbidden - API key is missing or invalid' });
  }

  try {
    // Type assertion to ensure apiKey is a string
    const isValidApiKey = bcrypt.compareSync(apiKey as string, API_KEY_HASH); // Assert apiKey as string

    // If the API key is invalid, return an error
    if (!isValidApiKey) {
      return res.status(403).json({ error: 'Forbidden - Invalid API key' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: 'Error validating API key: ' + error.message });
  }

  // Destructure the `username` from the request body
  const { username }: RequestBody = req.body;

  // Check if the username is provided
  if (!username) {
    return res.status(400).json({ error: 'Missing username in the request body' });
  }

  try {
    console.log('Creating thread for user:', username);

    // Prepare data for OpenAI API request
    const data = {
      model: 'gpt-3.5-turbo',  // You can replace with GPT-4 if needed
      prompt: `Hello, I'm ${username}. Let's start a conversation!`,  // User-specific prompt
      max_tokens: 150,  // You can adjust the number of tokens
      temperature: 0.7, // Controls randomness, set this as per your requirements
    };

    // Make the API request to OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/completions', 
      data, 
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_SECRET_KEY}`, 
          'Content-Type': 'application/json',
        },
      }
    );

    // Check if OpenAI returned a valid response
    if (!response.data || !response.data.choices || response.data.choices.length === 0) {
      throw new Error('No valid response from OpenAI API');
    }

    // Generate a threadId based on current timestamp
    const threadId = Date.now().toString();  // Unique thread ID based on timestamp

    // Return the thread ID and the initial message from OpenAI
    return res.status(200).json({
      threadId,
      initialMessage: response.data.choices[0].text.trim(), // Use .text instead of .message.content for completion
    });

  } catch (error: any) {
    console.error('Error during API request:', error);

    // Handle axios errors with detailed logging
    if (axios.isAxiosError(error)) {
      console.error('Axios error response:', error.response?.data);
      console.error('Axios error status:', error.response?.status);
    }

    return res.status(500).json({ error: 'Error creating thread: ' + error.message });
  }
}
