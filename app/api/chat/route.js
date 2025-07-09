import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { message, thread_id } = await req.json();

    if (!message || !thread_id) {
      return NextResponse.json(
        { error: 'Message or thread_id missing.' },
        { status: 400 }
      );
    }

    const assistantResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: message }],
    });

    const responseText = assistantResponse.choices?.[0]?.message?.content || 'No response text available';

    return NextResponse.json({
      assistantResponse: responseText,
      assistantMessage: { role: 'assistant', content: responseText },
    });
  } catch (error) {
    console.error('Error during OpenAI API call:', error);
    return NextResponse.json(
      { error: 'Failed to get response from OpenAI.' },
      { status: 500 }
    );
  }
}

export const config = {
  runtime: 'nodejs',
};
