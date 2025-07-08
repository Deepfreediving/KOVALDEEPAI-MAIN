import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  const { message, thread_id } = await req.json();

  if (!thread_id) {
    return new Response(JSON.stringify({ error: 'Missing thread_id' }), { status: 400 });
  }

  try {
    // Step 1: Add user's message to the thread
    await openai.beta.threads.messages.create(thread_id, {
      role: 'user',
      content: message,
    });

    // Step 2: Run the assistant
    const run = await openai.beta.threads.runs.create(thread_id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    // Step 3: Poll until run completes
    let runStatus;
    do {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      runStatus = await openai.beta.threads.runs.retrieve(thread_id, run.id);
    } while (runStatus.status !== 'completed' && runStatus.status !== 'failed');

    if (runStatus.status === 'failed') {
      return new Response(JSON.stringify({ error: 'Run failed.' }), { status: 500 });
    }

    // Step 4: Get assistant reply
    const messages = await openai.beta.threads.messages.list(thread_id);
    const assistantMessage = messages.data.find(
      (msg) => msg.role === 'assistant'
    );

    const assistantText = assistantMessage?.content?.[0]?.text?.value || 'No response';

    return new Response(JSON.stringify({ assistantResponse: assistantText }));
  } catch (err) {
    console.error('❌ Assistant Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
