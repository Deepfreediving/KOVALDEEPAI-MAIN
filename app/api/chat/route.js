import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req) {
  try {
    const { messages } = await req.json();

    // Step 1: Create a thread
    const thread = await openai.beta.threads.create();

    // Step 2: Add the user's message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: messages[messages.length - 1].content,
    });

    // Step 3: Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID,
    });

    // Step 4: Wait for the run to complete
    let runStatus;
    do {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    } while (runStatus.status !== "completed");

    // Step 5: Retrieve the messages
    const threadMessages = await openai.beta.threads.messages.list(thread.id);

    return new Response(
      JSON.stringify({
        response: threadMessages.data[0].content[0].text.value,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Assistant Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
