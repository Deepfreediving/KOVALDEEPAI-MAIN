import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";

// Initialize Pinecone client (create client once, not every request)
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  controllerHostUrl: process.env.PINECONE_HOST, // ✅ Use full Pinecone host URL
});

// Specify the index name (this can be dynamically set based on your needs)
const indexName = process.env.PINECONE_INDEX || "koval-deep-ai"; // Default to 'koval-deep-ai' if not set

// Query function
export async function POST(req) {
  try {
    // Parse the request body for the vector
    const { vector, topK = 10 } = await req.json();

    if (!vector || !Array.isArray(vector) || vector.length === 0) {
      return NextResponse.json(
        { error: "Invalid or missing vector" },
        { status: 400 },
      );
    }

    // Create an instance of the index
    const index = pc.index(indexName); // Use the created index

    // Perform the query to retrieve the topK most similar results
    const result = await index.query({
      vector, // The query vector that will be matched against the index
      topK, // Number of results to return (default is 10)
      includeValues: true, // Optionally include the vector values in the response
      includeMetadata: true, // Include metadata if available
    });

    // Return the matches found by the query
    return NextResponse.json({ matches: result.matches || [] });
  } catch (error) {
    console.error("Error querying Pinecone:", error.message || error);
    return NextResponse.json(
      { error: "Failed to query Pinecone" },
      { status: 500 },
    );
  }
}

export const config = {
  runtime: "nodejs", // Make sure to use the correct runtime
};
