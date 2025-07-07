// /app/api/chat/route.js
export const runtime = 'edge';

export async function POST(req) {
  const { message, threadId } = await req.json();

  const response = await fetch('https://api.openai.com/v1/threads', {
    method: threadId ? 'POST' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      assistant_id: process.env.ASSISTANT_ID,
      messages: [{ role: 'user', content: message }],
      ...(threadId && { thread_id: threadId }),
    }),
  });

  const result = await response.json();
  return new Response(JSON.stringify(result), { status: 200 });
}
