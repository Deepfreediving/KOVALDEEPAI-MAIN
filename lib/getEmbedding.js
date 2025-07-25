// pages/api/getEmbedding.js

import { Configuration, OpenAIApi } from "openai";

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { text } = req.body;

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Text is required and must be a string." });
  }

  try {
    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002", // or text-embedding-3-small if newer model
      input: text.trim(),
    });

    const vector = response?.data?.data?.[0]?.embedding;

    if (!vector) {
      throw new Error("No embedding returned");
    }

    return res.status(200).json({ vector });
  } catch (err) {
    console.error("❌ Error generating embedding:", err);
    return res.status(500).json({ error: "Embedding generation failed" });
  }
}
