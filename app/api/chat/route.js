import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    // Parse the request body to get the messages array
    const { messages } = await request.json();

    // Check if the messages array exists and is formatted correctly
    if (!messages || !Array.isArray(messages)) {
      console.error('❌ Invalid messages array.');
      return new Response(
        JSON.stringify({ error: 'Invalid messages array.' }),
        { status: 400 }
      );
    }

    // Log the messages for debugging
    console.log('Received messages:', messages);

    // Send the messages to OpenAI for processing
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
    });

    const reply = response.choices?.[0]?.message?.content || 'Oops, something went wrong. Try again.';

    return new Response(
      JSON.stringify({
        assistantMessage: {
          role: 'assistant',
          content: reply,
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Something went wrong.' }),
      { status: 500 }
    );
  }
}
