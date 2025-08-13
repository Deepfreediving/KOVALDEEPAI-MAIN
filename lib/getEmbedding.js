import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("❌ Missing required environment variable: OPENAI_API_KEY");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { text } = req.body;

    // ✅ Validate input
    if (!text || typeof text !== "string" || !text.trim()) {
      return res
        .status(400)
        .json({ error: "Text is required and must be a non-empty string." });
    }

    if (text.length > 16000) {
      return res.status(400).json({ error: "Text exceeds maximum allowed length." });
    }

    // ✅ Request embedding
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });

    const vector = response?.data?.[0]?.embedding;
    if (!vector) {
      throw new Error("No embedding vector returned from OpenAI API.");
    }

    return res.status(200).json({ vector });
  } catch (error) {
    console.error("❌ Embedding generation error:", error.response?.data || error.message);
    return res.status(500).json({
      error: "Embedding generation failed",
      details: error.response?.data?.error?.message || error.message,
    });
  }
}
