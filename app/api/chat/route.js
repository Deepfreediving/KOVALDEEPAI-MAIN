import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  const { message } = await req.json();

  // Create a new thread
  const thread = await openai.beta.threads.create();

  // Add user message to the thread
  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: message,
  });

  // Run the assistant on the thread
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: process.env.ASSISTANT_ID,
  });

  // Wait for run to complete (polling every 1s)
  let status;
  do {
    await new Promise((r) => setTimeout(r, 1000));
    const updatedRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    status = updatedRun.status;
  } while (status !== 'completed');

  // Get the latest messages
  const messages = await openai.beta.threads.messages.list(thread.id);

  const assistantReply = messages.data
    .reverse()
    .find((msg) => msg.role === 'assistant')?.content[0]?.text?.value;

  return Response.json({
    choices: [{ message: { role: 'assistant', content: assistantReply || 'No response received.' } }],
  });
}
