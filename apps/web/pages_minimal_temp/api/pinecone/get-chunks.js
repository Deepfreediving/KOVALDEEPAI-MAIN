require("dotenv").config();
const { OpenAI } = require("openai");
const { Pinecone } = require("@pinecone-database/pinecone");
import handleCors from "@/utils/handleCors";

// Initialize OpenAI and Pinecone clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// Get the index
const index = pinecone.index(process.env.PINECONE_INDEX || "koval-deep-ai");

// Get embedding for the user's query
async function getQueryEmbedding(query) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small", // Match the ingestion model
      input: query,
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error("❌ Error generating embedding:", err.message);
    throw err;
  }
}

// Query Pinecone and return raw chunks
async function getKnowledgeChunks(query, topK = 5) {
  try {
    const embedding = await getQueryEmbedding(query);

    const result = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true,
    });

    // Return raw chunks with metadata
    if (result.matches && result.matches.length > 0) {
      return result.matches
        .map((match) => ({
          text: match?.metadata?.text || "",
          score: match.score || 0,
          metadata: match.metadata || {},
        }))
        .filter((chunk) => chunk.text.trim() !== "");
    } else {
      return [];
    }
  } catch (err) {
    console.error("❌ Error querying Pinecone for chunks:", err.message);
    throw new Error("Failed to query Pinecone");
  }
}

// API handler - returns raw knowledge chunks
module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { query, topK = 5 } = req.body;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query must be a string" });
  }

  try {
    const chunks = await getKnowledgeChunks(query, topK);

    console.log(
      `✅ Retrieved ${chunks.length} knowledge chunks for query: "${query}"`,
    );

    return res.status(200).json({
      chunks: chunks.map((chunk) => chunk.text), // Just return the text for simplicity
      count: chunks.length,
      query,
    });
  } catch (err) {
    console.error("❌ Get chunks handler error:", err.message || err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
