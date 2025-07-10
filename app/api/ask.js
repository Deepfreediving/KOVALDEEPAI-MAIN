import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { semanticSearch } from "../semanticSearch";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.Index("koval-deep-ai");

export async function POST(req) {
  const { messages } = await req.json();
  const latestMessage = messages[messages.length - 1].content;

  // 🔍 Step 1: Query Pinecone for relevant memory
  const memory = await semanticSearch(index, latestMessage);

  // 🔗 Step 2: Inject memory context into assistant prompt
  const contextBlock = memory.length
    ? memory.map((r, i) => `Context ${i + 1}:\n${r.metadata.text}`).join("\n\n")
    : "No relevant context found.";

  const systemPrompt = `
You are Koval Deep AI, a freediving expert assistant trained on Daniel Koval’s protocols.
Use the following memory to answer questions precisely:

${contextBlock}

Be structured, clear, and stick to verified documents. If unsure, say so.
`;

  // 🧠 Step 3: Send chat request to OpenAI
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  const text = response.choices[0].message.content;
  return new Response(JSON.stringify({ text }));
}
