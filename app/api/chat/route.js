// app/api/chat/route.js
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { message, thread_id } = await req.json();

    if (!thread_id || !thread_id.startsWith('thread')) {
      return new Response(JSON.stringify({ error: 'Invalid thread_id' }), {
        status: 400,
      });
    }

    await openai.beta.threads.messages.create(thread_id, {
      role: 'user',
      content: message,
    });

    const run = await openai.beta.threads.runs.create(thread_id, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID,
    });

    let completedRun;
    const start = Date.now();
    while (Date.now() - start < 10000) {
      const check = await openai.beta.threads.runs.retrieve(thread_id, run.id);
      if (check.status === 'completed') {
        completedRun = check;
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!completedRun) {
      return new Response(JSON.stringify({ error: 'Run timed out' }), {
        status: 500,
      });
    }

    const messages = await openai.beta.threads.messages.list(thread_id);
    const last = messages.data.find((m) => m.role === 'assistant');

    return Response.json({ assistantResponse: last?.content[0]?.text?.value || '' });
  } catch (err) {
    console.error('❌ Assistant Error:', err);
    return new Response(JSON.stringify({ error: 'Assistant error' }), {
      status: 500,
    });
  }
}
