import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


console.log("✅ API KEY:", process.env.OPENAI_API_KEY);
console.log("✅ ASSISTANT ID:", process.env.ASSISTANT_ID);

//... rest of code

export const runtime = 'edge'; // optional: if you want edge runtime
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    let status;
    do {
      await new Promise((r) => setTimeout(r, 1000));
      const updatedRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      status = updatedRun.status;
    } while (status !== 'completed' && status !== 'failed');

    if (status === 'failed') {
      return NextResponse.json({
        choices: [{
          message: {
            role: 'assistant',
            content: '❌ Assistant failed to generate a response.',
          },
        }],
      });
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantReply = messages.data
      .reverse()
      .find((msg) => msg.role === 'assistant')?.content[0]?.text?.value;

    return NextResponse.json({
      choices: [{
        message: {
          role: 'assistant',
          content: assistantReply || '⚠️ Assistant responded with no content.',
        },
      }],
    });
  } catch (error) {
    console.error('❌ Assistant Error:', error);
    console.error('❌ Vercel Error:', error);
    return NextResponse.json({
      choices: [{
        message: {
          role: 'assistant',
          content: '❌ Server error occurred. Please check Vercel logs.',
        },
      }],
    }, { status: 500 });
  }
}
