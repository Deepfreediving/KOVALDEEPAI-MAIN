import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { Pinecone, Index } from '@pinecone-database/pinecone'; // Import Pinecone.Index explicitly

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});

let index: Index; // Explicitly declare the type of 'index' as Index
try {
  index = pinecone.Index(process.env.PINECONE_INDEX || "");
} catch (err) {
  if (err instanceof Error) {
    console.error("❌ Pinecone index init error:", err.message);
  } else {
    console.error("❌ Unknown error during Pinecone index initialization.");
  }
}

// Step 1: Get query embedding
async function getQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    return response?.data?.[0]?.embedding || [];
  } catch (err) {
    if (err instanceof Error) {
      console.error("❌ Embedding generation failed:", err.message);
    } else {
      console.error("❌ Unknown error during embedding generation.");
    }
    throw new Error('Embedding generation failed.');
  }
}

// Step 2: Search Pinecone vector DB
async function queryPinecone(query: string): Promise<string[]> {
  const embedding = await getQueryEmbedding(query);
  if (!embedding) throw new Error('Embedding is undefined.');
  if (!index) throw new Error('Pinecone index not initialized.');

  try {
    const result = await index.query({
      vector: embedding,
      topK: 6,
      includeMetadata: true,
    });

    return result?.matches
      ?.map((m: any) => m.metadata?.text)
      .filter(Boolean) || [];
  } catch (err) {
    if (err instanceof Error) {
      console.error("❌ Pinecone query error:", err.message);
    } else {
      console.error("❌ Unknown error during Pinecone query.");
    }
    throw new Error('Pinecone vector search failed.');
  }
}

// Step 3: Ask OpenAI using context
async function askWithContext(contextChunks: string[], question: string): Promise<string> {
  const context = contextChunks.join("\n\n");

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a freediving coach with expert knowledge of breath-hold and equalization techniques. 
                    Always provide detailed, step-by-step instructions for any exercises or tools.
                    If you mention any exercise, especially advanced ones like the Progressive Mouthfill Compression with Reverse Packing, 
                    ensure you explain all steps thoroughly. These include preparation, correct posture, breathing technique, 
                    and training tips for safety and efficiency. Additionally, always ensure you clarify when and where each tool should be used.
                    Be cautious about tool references and use precise language to avoid any misunderstandings.
                  `.trim(),
        },
        {
          role: 'user',
          content: `Context:\n${context}\n\nQuestion: ${question}`,
        },
      ],
      temperature: 0.3, // Lower temperature to prioritize factual and accurate answers
      max_tokens: 700,
    });

    return response?.choices?.[0]?.message?.content?.trim() || "No answer generated.";
  } catch (err) {
    if (err instanceof Error) {
      console.error("❌ OpenAI chat error:", err.message);
    } else {
      console.error("❌ Unknown error during OpenAI chat.");
    }
    throw new Error('Failed to generate assistant response.');
  }
}

// ✅ API Route
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message must be a non-empty string." });
  }

  try {
    // Fetch relevant context chunks from Pinecone or other sources here
    const contextChunks = await queryPinecone(message);

    if (contextChunks.length === 0) {
      return res.status(200).json({
        assistantMessage: {
          role: "assistant",
          content: "⚠️ No relevant information found for your question.",
        },
      });
    }

    const answer = await askWithContext(contextChunks, message);

    return res.status(200).json({
      assistantMessage: {
        role: "assistant",
        content: answer,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      console.error("❌ /api/chat internal error:", err.message);
    } else {
      console.error("❌ Unknown error during API chat.");
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
