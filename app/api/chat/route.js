import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client with API Key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { message, thread_id } = await req.json();

    // Ensure message and thread_id are passed
    if (!message || !thread_id) {
      console.error('Missing message or thread_id');
      return NextResponse.json(
        { error: 'Message or thread_id missing.' },
        { status: 400 }
      );
    }

    // Make the API call to OpenAI for chat completions
    const assistantResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Use a stable model (e.g., GPT-3.5)
      messages: [{ role: 'user', content: message }],
    });

    // Validate the response from OpenAI
    if (!assistantResponse || !assistantResponse.choices || !assistantResponse.choices[0].message) {
      console.error('No valid response from OpenAI');
      return NextResponse.json(
        { error: 'Failed to get a valid response from OpenAI.' },
        { status: 500 }
      );
    }

    const responseText = assistantResponse.choices[0].message.content;

    return NextResponse.json({
      assistantResponse: responseText,
    });
  } catch (error) {
    console.error('Error during API call:', error);
    return NextResponse.json(
      { error: 'Failed to get response from OpenAI.' },
      { status: 500 }
    );
  }
}

export const config = {
  runtime: 'edge', // Ensure correct runtime setup for Vercel
};
