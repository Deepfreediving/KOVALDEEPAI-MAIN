// app/api/create-thread/route.js
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST() {
  try {
    const thread = await openai.beta.threads.create();
    return Response.json({ thread_id: thread.id });
  } catch (err) {
    console.error('❌ Failed to create thread:', err);
    return new Response(JSON.stringify({ error: 'Failed to create thread' }), {
      status: 500,
    });
  }
}
