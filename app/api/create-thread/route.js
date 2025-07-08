import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST() {
  const thread = await openai.beta.threads.create();
  return new Response(JSON.stringify({ thread_id: thread.id }));
}
