import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function semanticSearch(index, query) {
  // Validate input
  if (!index || !query || typeof query !== "string" || query.trim() === "") {
    throw new Error("Invalid index or query.");
  }

  try {
    // Create embedding for the query using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Query Pinecone to find the most relevant documents
    const pineconeResponse = await index.query({
      vector: queryEmbedding,
      topK: 5, // Number of similar items you want to retrieve
      includeMetadata: true,
    });

    return pineconeResponse.matches;
  } catch (error) {
    console.error("Error in semanticSearch:", error);
    throw new Error("Failed to perform semantic search.");
  }
}
