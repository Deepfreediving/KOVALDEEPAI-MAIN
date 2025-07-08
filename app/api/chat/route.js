import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, thread_id } = body;

    // 🔒 Safety checks
    if (!message || typeof message !== 'string' || !message.trim().length) {
      return Response.json({ error: "Invalid or empty message." }, { status: 400 });
    }

    if (!thread_id) {
      return Response.json({ error: "Missing thread_id." }, { status: 400 });
    }

    // 🔁 Send message to assistant
    await openai.beta.threads.messages.create(thread_id, {
      role: "user",
      content: message,
    });

    // 🤖 Run the assistant
    const run = await openai.beta.threads.runs.create(thread_id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    // ⏳ Poll for completion
    let completed = false;
    let runStatus = null;

    while (!completed) {
      runStatus = await openai.beta.threads.runs.retrieve(thread_id, run.id);
      if (runStatus.status === "completed") {
        completed = true;
      } else if (["failed", "cancelled", "expired"].includes(runStatus.status)) {
        return Response.json({ error: `Run failed with status: ${runStatus.status}` }, { status: 500 });
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    // 🧠 Get assistant's reply
    const messages = await openai.beta.threads.messages.list(thread_id);
    const lastMessage = messages.data.find((m) => m.role === "assistant");

    if (!lastMessage) {
      return Response.json({ error: "No assistant response found." }, { status: 500 });
    }

    return Response.json({ assistantResponse: lastMessage.content[0].text.value });
  } catch (err) {
    console.error("❌ Assistant Error:", err);
    return Response.json({ error: "Server error occurred." }, { status: 500 });
  }
}
