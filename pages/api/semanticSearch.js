import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Your OpenAI API Key
});

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY, // Pinecone API Key from environment
  controllerHostUrl:
    process.env.PINECONE_HOST || "https://koval-deep-ai-w6g93nl.svc.aped-4627-b74a.pinecone.io", // Default host if not set
});

const index = pinecone.index(process.env.PINECONE_INDEX); // Specify your Pinecone index name from environment variables

// Function for performing semantic search
export async function semanticSearch(query) {
  if (!query || typeof query !== "string" || query.trim() === "") {
    throw new Error("Invalid query.");
  }

  try {
    // Create the embedding for the query using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002", // A commonly used embedding model (you may need to adjust this if you want a different model)
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Query Pinecone for similar vectors
    const pineconeResponse = await index.query({
      vector: queryEmbedding, // The vector created from the query
      topK: 5, // Limit results to top 5 most similar items
      includeMetadata: true, // Optionally include metadata for each match
    });

    return pineconeResponse.matches;
  } catch (error) {
    console.error("Error querying Pinecone:", error.message);
    throw new Error("Error querying Pinecone");
  }
}

// API handler to process requests
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    // Perform semantic search using the query
    const results = await semanticSearch(query);
    res.status(200).json(results); // Return the matched results from Pinecone
  } catch (error) {
    console.error("Error in semanticSearch:", error);
    res.status(500).json({ error: "Failed to perform semantic search." });
  }
}
