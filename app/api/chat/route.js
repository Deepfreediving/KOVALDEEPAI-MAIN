import { NextResponse } from 'next/server'; // Import NextResponse
import getConfig from 'next/config';
import OpenAI from 'openai';

// Access serverRuntimeConfig for private keys
const { serverRuntimeConfig } = getConfig();

// Initialize OpenAI client with the API Key
const openai = new OpenAI({
  apiKey: serverRuntimeConfig.OPENAI_API_KEY,
});

// Function to handle the POST request
export async function POST(request) {
  try {
    // Access the API key from serverRuntimeConfig
    const openaiApiKey = serverRuntimeConfig.OPENAI_API_KEY;

    // Log the API Key for debugging purposes (remove for production)
    console.log('OPENAI_API_KEY:', openaiApiKey);

    // Example: Use the OPENAI_API_KEY for OpenAI request (uncomment below for functionality)
    // const response = await openai.chat.completions.create({
    //   model: 'gpt-4',
    //   messages: [{ role: 'user', content: 'Hello!' }],
    // });

    // For now, just returning a test response
    return NextResponse.json({ message: 'API response here' });

  } catch (error) {
    // Handle any errors
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
