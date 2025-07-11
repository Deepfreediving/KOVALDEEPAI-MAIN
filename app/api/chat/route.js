import { openai } from '@lib/openai';
import { NextResponse } from 'next/server';
import pineconeIndex from '../pineconeInit';  // Correct path


export async function POST(req) {
  try {
    const { message, thread_id } = await req.json();
    let validThreadId = thread_id;

    // OpenAI Assistant ID validation
    if (!process.env.OPENAI_ASSISTANT_ID) {
      console.error('Missing OPENAI_ASSISTANT_ID environment variable');
      return new NextResponse(
        JSON.stringify({ error: 'Assistant not configured.' }),
        { status: 500 },
      );
    }

    // Create a new thread if no valid thread_id is passed
    if (!validThreadId) {
      const thread = await openai.beta.threads.create();
      if (thread && thread.id) {
        validThreadId = thread.id;
        console.log(`Created new thread with ID: ${validThreadId}`);
      } else {
        console.error("Thread creation failed");
        return new NextResponse(JSON.stringify({ error: "Thread creation failed" }), { status: 500 });
      }
    }

    // Send user message to the thread
    const messageResponse = await openai.beta.threads.messages.create(validThreadId, {
      role: 'user',
      content: message,
    });
    console.log('Message sent successfully:', messageResponse);

    // Trigger the assistant's response (run creation)
    const run = await openai.beta.threads.runs.create(validThreadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID,
    });

    // Poll the status of the run
    let status = run.status;
    let runResult = run;
    let attempts = 0;
    while (!['completed', 'failed', 'cancelled'].includes(status) && attempts < 20) {
      await new Promise((res) => setTimeout(res, 1000));
      runResult = await openai.beta.threads.runs.retrieve(validThreadId, run.id);
      status = runResult.status;
      attempts += 1;
    }

    if (status !== 'completed') {
      console.log(`Run failed or timed out with status: ${status}`);
      return new NextResponse(
        JSON.stringify({ error: `Run ${status}` }),
        { status: 500 },
      );
    }

    // Fetch assistant's reply (latest assistant message)
    const messages = await openai.beta.threads.messages.list(validThreadId, {
      order: 'desc',
      limit: 1,
    });
    const assistantMessage = messages.data.find((msg) => msg.role === 'assistant');

    // Store assistant's response in Pinecone
    await pineconeIndex.upsert([
      {
        id: validThreadId,
        values: [assistantMessage?.content || 'No response'],
      },
    ]);

    return NextResponse.json({
      assistantResponse: assistantMessage?.content || 'No response.',
    });

  } catch (err) {
    console.error('[Chat API Error]', err);
    return new NextResponse(JSON.stringify({ error: 'Assistant failed.' }), { status: 500 });
  }
}
