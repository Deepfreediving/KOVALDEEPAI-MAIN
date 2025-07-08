import OpenAI from 'openai';
import { NextResponse } from 'next/server';

console.log("✅ API KEY:", process.env.OPENAI_API_KEY);
console.log("✅ ASSISTANT ID:", process.env.ASSISTANT_ID);

export const runtime = 'edge';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { message } = await req.json();
    console.log("✅ Received message:", message);

    if (!message) {
      console.log("❌ No message provided");
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    const thread = await openai.beta.threads.create();
    console.log("✅ Thread created:", thread.id);

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message,
    });
    console.log("✅ User message added to thread");

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });
    console.log("✅ Run created:", run.id);

    let status;
    let attempts = 0;
    do {
      await new Promise((r) => setTimeout(r, 1000));
      const updatedRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      status = updatedRun.status;
      attempts++;
      console.log(`🔄 Polling run status: ${status} (attempt ${attempts})`);
    } while (status !== 'completed' && status !== 'failed' && attempts < 10);

    if (status === 'failed') {
      console.log("❌ Run failed");
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

    console.log("✅ Final Assistant Reply:", assistantReply);

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
