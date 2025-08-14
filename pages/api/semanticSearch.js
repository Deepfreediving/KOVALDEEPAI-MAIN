import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import handleCors from "@/utils/handleCors";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

if (!OPENAI_API_KEY) console.error("❌ OPENAI_API_KEY is required");
if (!PINECONE_API_KEY) console.error("❌ PINECONE_API_KEY is required");
if (!PINECONE_INDEX) console.error("❌ PINECONE_INDEX is missing");

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || "" });

let pinecone, index;
try {
  if (PINECONE_API_KEY && PINECONE_INDEX) {
    pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    index = pinecone.index(PINECONE_INDEX);
    console.log("✅ Pinecone initialized for semantic search");
  }
} catch (error) {
  console.error("❌ Pinecone initialization failed:", error);
}

export async function semanticSearch(query, options = {}) {
  if (!query?.trim())
    throw new Error("Invalid query - must be a non-empty string");
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");
  if (!index) throw new Error("Pinecone index not available");

  const { topK = 5, includeMetadata = true, filter = null } = options;

  try {
    console.log(`🔍 Semantic search for: "${query.slice(0, 50)}..."`);

    // Use latest model
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query.trim(),
    });

    const queryEmbedding = embeddingResponse?.data?.[0]?.embedding;
    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      throw new Error("Invalid embedding generated");
    }

    const queryOptions = {
      vector: queryEmbedding,
      topK: Math.min(Math.max(topK, 1), 100),
      includeMetadata,
      ...(filter && { filter }),
    };

    const pineconeResponse = await index.query(queryOptions);
    const matches = pineconeResponse?.matches || [];
    console.log(`✅ Found ${matches.length} matches`);
    return matches;
  } catch (error) {
    console.error("❌ Semantic search error:", error);
    throw new Error(`Semantic search failed: ${error.message}`);
  }
}

export default async function handler(req, res) {
  const startTime = Date.now();

  try {
    await handleCors(req, res);
    if (req.method === "OPTIONS") return;

    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method Not Allowed",
        message: "Only POST requests are allowed",
      });
    }

    const { query, topK, filter } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        error: "Invalid Query",
        message: "query must be a non-empty string",
      });
    }

    if (query.length > 8000) {
      return res.status(400).json({
        error: "Query Too Long",
        message: "query must be less than 8000 characters",
      });
    }

    const results = await semanticSearch(query, { topK, filter });

    const processingTime = Date.now() - startTime;
    return res.status(200).json({
      results,
      metadata: {
        query: query.slice(0, 100),
        resultCount: results.length,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Semantic search API error:", error.message);

    return res.status(500).json({
      error: "Semantic Search Failed",
      message: error.message || "Internal server error",
      metadata: {
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
    responseLimit: false,
  },
};
