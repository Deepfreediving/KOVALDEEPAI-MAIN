import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client with API Key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { message, thread_id } = await req.json();

    if (!message || !thread_id) {
      return NextResponse.json(
        { error: 'Message or thread_id missing.' },
        { status: 400 }
      );
    }

    // Assuming you need both message and thread_id for the API call
    const assistantResponse = await openai.chat.completions.create({
      model: 'gpt-4', // Make sure to choose the correct model
      messages: [{ role: 'user', content: message }],
      threadId: thread_id, // Ensure the thread_id is correctly used here
    });

    // Check the response structure from OpenAI, adjust accordingly
    const responseText = assistantResponse.choices?.[0]?.message?.content || 'No response text available';

    return NextResponse.json({
      assistantResponse: responseText,
    });
  } catch (error) {
    // Error in OpenAI API call
    console.error('Error in OpenAI API call:', error);
    return NextResponse.json(
      { error: 'Failed to get response from OpenAI.' },
      { status: 500 }
    );
  }
}

export const config = {
  runtime: 'edge', // Ensure you have the correct runtime setup for Vercel
};
