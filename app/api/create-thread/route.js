import OpenAI from 'openai';

// Initialize OpenAI with your API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST() {
  try {
    // Create a new thread using the OpenAI API
    const thread = await openai.beta.threads.create();
    return new Response(JSON.stringify({ thread_id: thread.id }));
  } catch (err) {
    // Log the error and return a failure response
    console.error('❌ Failed to create thread:', err);
    return new Response(JSON.stringify({ error: 'Failed to create thread' }), {
      status: 500,
    });
  }
}
