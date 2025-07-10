import { openai } from '@lib/openai';
import { NextResponse } from 'next/server'; // Import NextResponse

export async function POST(req) {
  try {
    const { message, thread_id } = await req.json();
    let validThreadId = thread_id;

    // If no valid thread_id is passed, create a new thread
    if (!validThreadId) {
      const thread = await openai.beta.threads.create();
      validThreadId = thread.id;
      console.log(`Created new thread with ID: ${validThreadId}`); // Log for debugging

      // Check if the thread creation was successful
      if (!validThreadId) {
        console.log('Thread creation failed, no validThreadId returned');
        return new NextResponse(JSON.stringify({ error: 'Thread creation failed' }), { status: 500 });
      }
    }

    // Log thread ID being used
    console.log('Using thread ID:', validThreadId);

    // Check if thread exists or was created
    if (!validThreadId) {
      console.log('Thread ID is invalid or not found');
      return new NextResponse(JSON.stringify({ error: 'Invalid thread ID' }), { status: 404 });
    }

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

    console.log('Polling run status...');
    while (status !== 'completed' && status !== 'failed' && status !== 'cancelled') {
      await new Promise((res) => setTimeout(res, 1000));
      runResult = await openai.beta.threads.runs.retrieve(validThreadId, run.id);
      status = runResult.status;
      console.log(`Current status: ${status}`);  // Log the current status during polling
    }

    if (status !== 'completed') {
      console.log(`Run failed with status: ${status}`);  // Log if run fails
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
