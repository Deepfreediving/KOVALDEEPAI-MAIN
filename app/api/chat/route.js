import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  const { message, thread_id } = await req.json();
  
  if (!message || !thread_id) {
    return new Response(JSON.stringify({ error: 'Message or thread_id missing.' }), { status: 400 });
  }

  try {
    // Create a new thread and message
    const thread = await openai.chat.createThread({ thread_id });
    const userMessage = await openai.chat.addMessage(thread.id, {
      role: 'user',
      content: message,
    });

    // Fetch assistant response
    const assistantResponse = await openai.chat.getResponse(thread.id);

    return new Response(
      JSON.stringify({ assistantResponse: assistantResponse.text }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}
