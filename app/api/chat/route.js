import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client with API Key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is missing.' },
        { status: 400 }
      );
    }

    // Make the API call to OpenAI for chat completions
    const assistantResponse = await openai.chat.completions.create({
      model: 'gpt-4', // Ensure you have the correct model
      messages: [{ role: 'user', content: message }],
    });

    // Check the response structure from OpenAI
    const responseText = assistantResponse.choices?.[0]?.message?.content || 'No response text available';

    return NextResponse.json({
      assistantResponse: responseText,
      assistantMessage: { role: 'assistant', content: responseText },
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
  runtime: 'nodejs', // Change from 'edge' to 'nodejs'
};


