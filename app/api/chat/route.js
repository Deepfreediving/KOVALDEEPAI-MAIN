import { openai } from '@lib/openai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message, thread_id } = await req.json();
    let validThreadId = thread_id;

    // If no valid thread_id is passed, create a new thread
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

    console.log('Using thread ID:', validThreadId);  // Ensure thread ID is valid

    // Send the user message to the thread
    const messageResponse = await openai.beta.threads.messages.create(validThreadId, {
      role: 'user',
      content: message,
    });
    console.log('Message sent successfully:', messageResponse); // Log the response from message sending

    // Create the thread run (trigger assistant)
    const run = await openai.beta.threads.runs.create(validThreadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID,
    });

    // Poll the status of the run
    let status = run.status;
    let runResult = run;

    while (!['completed', 'failed', 'cancelled'].includes(status)) {
      await new Promise((res) => setTimeout(res, 1000));
      runResult = await openai.beta.threads.runs.retrieve(validThreadId, run.id);
      status = runResult.status;
    }

    if (status !== 'completed') {
      console.log(`Run failed with status: ${status}`);
      return new NextResponse(JSON.stringify({ error: `Run ${status}` }), { status: 500 });
    }

    // Fetch assistant's reply
    const messages = await openai.beta.threads.messages.list(validThreadId);
    const assistantMessage = messages.data.find((msg) => msg.role === 'assistant');

    return NextResponse.json({
      assistantResponse: assistantMessage?.content?.[0]?.text?.value || 'No response.',
    });

  } catch (err) {
    console.error('[Chat API Error]', err);
    return new NextResponse(JSON.stringify({ error: 'Assistant failed.' }), { status: 500 });
  }
}
