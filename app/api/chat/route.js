import { openai } from '@lib/openai';  // Import OpenAI helper functions
import pineconeIndex from '../pineconeInit';  // Import Pinecone index for data storage
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message, thread_id } = await req.json();
    let validThreadId = thread_id;

    // If no valid thread_id, create a new thread
    if (!validThreadId) {
      const thread = await openai.createThread();  // Create a new thread in OpenAI
      validThreadId = thread.id;
    }

    // Send message to OpenAI and get the response
    const response = await openai.createMessage(validThreadId, message);

    // Store the assistant's reply in Pinecone (if necessary)
    await pineconeIndex.upsert([{ id: validThreadId, values: [response.data] }]);

    return new NextResponse(JSON.stringify({ response: response.data }));
  } catch (err) {
    console.error('Error:', err);
    return new NextResponse(JSON.stringify({ error: 'An error occurred.' }), { status: 500 });
  }
}
