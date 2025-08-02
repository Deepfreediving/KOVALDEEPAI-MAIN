import type { NextApiRequest, NextApiResponse } from "next";
import { queryVectors } from "@/lib/pineconeService";
import { OpenAI } from "openai";
import handleCors from "@/utils/cors";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ApiResponse {
  success: boolean;
  data?: unknown;
  answer?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (await handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const { query } = req.body;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ success: false, error: "Query must be a string." });
  }

  try {
    // 1️⃣ Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const vector = embeddingResponse.data[0]?.embedding;

    if (!vector) {
      throw new Error("No embedding returned from OpenAI.");
    }

    // 2️⃣ Query Pinecone with the vector
    const matches = await queryVectors(vector, 5);

    if (!matches.length) {
      return res.status(200).json({
        success: true,
        answer: "I couldn't find relevant information in the database.",
      });
    }

    // 3️⃣ Combine matched text as context
    const context = matches.map((m) => m.metadata?.text || "").join("\n\n");

    // 4️⃣ Ask GPT for an answer
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are an assistant answering questions based on the provided context." },
        { role: "user", content: `Context:\n${context}\n\nQuestion: ${query}` },
      ],
      temperature: 0.2,
    });

    const answer = chatResponse.choices[0]?.message?.content?.trim() || "";

    return res.status(200).json({
      success: true,
      data: matches,
      answer,
    });
  } catch (error: any) {
    console.error("❌ Pinecone query error:", error.message || error);
    return res.status(500).json({
      success: false,
      error: `Failed to query Pinecone: ${error.message || "Unknown error"}`,
    });
  }
}
