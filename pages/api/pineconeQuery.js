import dotenv from "dotenv";
dotenv.config(); // If you don't need a custom path, just use dotenv.config()

import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Specify the index name (should be provided in .env or default to 'koval-deep-ai')
const indexName = process.env.PINECONE_INDEX || "koval-deep-ai";
const index = pinecone.Index(indexName);

// Function to get embedding for the query
async function getQueryEmbedding(query) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002", // Ensure correct model is used
      input: query,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating query embedding:", error);
    throw new Error("Failed to generate query embedding");
  }
}

// Function to query Pinecone with the embedding
async function queryPinecone(query) {
  try {
    const embedding = await getQueryEmbedding(query);
    const result = await index.query({
      topK: 3,
      vector: embedding,
      includeMetadata: true, // Include metadata if necessary
    });
    return result;
  } catch (error) {
    console.error("Error querying Pinecone:", error);
    throw new Error("Failed to query Pinecone");
  }
}

// API handler
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { query } = req.body;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    const result = await queryPinecone(query);
    return res.status(200).json(result); // Send the results back to the client
  } catch (err) {
    console.error("Error handling query:", err.message || err);
    return res.status(500).json({ error: "Failed to query Pinecone" });
  }
}
