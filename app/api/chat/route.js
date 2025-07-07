export async function POST(req) {
  try {
    const { message } = await req.json();

    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    let status;
    do {
      await new Promise((r) => setTimeout(r, 1000));
      const updatedRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      status = updatedRun.status;
    } while (status !== 'completed');

    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantReply = messages.data
      .reverse()
      .find((msg) => msg.role === 'assistant')?.content[0]?.text?.value;

    return Response.json({
      choices: [{ message: { role: 'assistant', content: assistantReply || 'No response received.' } }],
    });

  } catch (err) {
    console.error('❌ Assistant Error:', err);
    return new Response(
      JSON.stringify({ error: 'Assistant failed. Check console for details.' }),
      { status: 500 }
    );
  }
}
