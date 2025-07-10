import { openai } from '../../lib/openai';  // Ensure this points to the correct path

export async function POST() {
  try {
    // Create a new thread
    const thread = await openai.beta.threads.create();

    // Log thread creation for debugging
    console.log(`Created new thread with ID: ${thread.id}`);

    return new Response(JSON.stringify({ thread_id: thread.id }), { status: 200 });
  } catch (err) {
    console.error('[Thread Creation Error]', err);
    return new Response(JSON.stringify({ error: 'Thread creation failed.' }), { status: 500 });
  }
}
