import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, thread_id } = body;

    if (!message || typeof message !== 'string' || !message.trim().length) {
      return Response.json({ error: "Invalid message." }, { status: 400 });
    }

    if (!thread_id) {
      return Response.json({ error: "Missing thread_id." }, { status: 400 });
    }

    await openai.beta.threads.messages.create(thread_id, {
      role: "user",
      content: message,
    });

    const run = await openai.beta.threads.runs.create(thread_id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    let completed = false;
    let runStatus = null;

    while (!completed) {
      runStatus = await openai.beta.threads.runs.retrieve(thread_id, run.id);
      if (runStatus.status === "completed") {
        completed = true;
      } else if (["failed", "cancelled", "expired"].includes(runStatus.status)) {
        return Response.json({ error: `Run failed: ${runStatus.status}` }, { status: 500 });
      }
      await new Promise((res) => setTimeout(res, 1000));
    }

    const messages = await openai.beta.threads.messages.list(thread_id);
    const assistantMessage = messages.data.find((msg) => msg.role === "assistant");

    if (!assistantMessage) {
      return Response.json({ error: "No assistant response found." }, { status: 500 });
    }

    return Response.json({ assistantResponse: assistantMessage.content[0].text.value });
  } catch (err) {
    console.error("❌ API Chat Route Error:", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
