import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client with API Key from Vercel environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // Use the environment variable set in Vercel
});

export async function POST(req) {
  try {
    // Parse the request body for message and thread_id
    const { message, thread_id } = await req.json();

    // Check for missing message or thread_id
    if (!message || !thread_id) {
      return NextResponse.json(
        { error: 'Message or thread_id missing.' },
        { status: 400 }
      );
    }

    // Make the API call to OpenAI for chat completions
    const assistantResponse = await openai.chat.completions.create({
      model: 'gpt-4', // Specify the model you want to use
      messages: [{ role: 'user', content: message }],
    });

    // Check the response structure from OpenAI
    const responseText = assistantResponse.choices?.[0]?.message?.content || 'No response text available';

    // Return the assistant's response
    return NextResponse.json({
      assistantResponse: responseText,
      assistantMessage: { role: 'assistant', content: responseText },
    });
  } catch (error) {
    // Log and return an error message if the API call fails
    console.error('Error in OpenAI API call:', error);
    return NextResponse.json(
      { error: 'Failed to get response from OpenAI.' },
      { status: 500 }
    );
  }
}

// Vercel runtime configuration
export const config = {
  runtime: 'nodejs', // Ensure you're using Node.js runtime on Vercel
};
