/**
 * 🎯 OPTIMIZED PINECONE QUERY ENDPOINT
 * Updated to use optimized Pinecone service with better relevance and stability
 */

require("dotenv").config();
const { OpenAI } = require("openai");
const { Pinecone } = require("@pinecone-database/pinecone");
import handleCors from "@/utils/handleCors";
import { queryPineconeOptimized } from "@/lib/pineconeService";

// Legacy clients for fallback
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index(process.env.PINECONE_INDEX || "koval-deep-ai");

// Get embedding for the user's query
async function getQueryEmbedding(query) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small", // ✅ Match the ingestion model
      input: query,
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error("❌ Error generating embedding:", err.message);
    throw err;
  }
}

// Query Pinecone using embedding
async function queryPineconeAndSearchDocs(query) {
  try {
    const embedding = await getQueryEmbedding(query);

    const result = await index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    // Ensure there are matches before mapping
    if (result.matches && result.matches.length > 0) {
      return result.matches
        .map((match) => match?.metadata?.text || "")
        .filter((text) => text.trim() !== "");
    } else {
      return [];
    }
  } catch (err) {
    console.error("❌ Error querying Pinecone:", err.message);
    throw new Error("Failed to query Pinecone");
  }
}

// Ask GPT with vector context
async function askGPTWithContext(chunks, question) {
  const context = chunks.join("\n\n---\n\n"); // separator improves clarity

  const messages = [
    {
      role: "system",
      content:
        'You are a helpful assistant answering user questions strictly based on the provided context. If the answer is not in the context, reply "I don’t know."',
    },
    {
      role: "user",
      content: `Context:\n${context}\n\nQuestion: ${question}`,
    },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.2,
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("❌ GPT error:", err.message);
    throw err;
  }
}

// API handler with optimized Pinecone service
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { query, returnChunks = false } = req.body;
  console.log(`🔍 Optimized Pinecone endpoint called with query: "${query}" (returnChunks: ${returnChunks})`);

  if (!query || typeof query !== "string") {
    console.log("❌ Invalid query provided");
    return res.status(400).json({ error: "Query must be a string" });
  }

  try {
    console.log("🚀 Using optimized Pinecone service...");
    
    // Use optimized service with enhanced relevance filtering
    const result = await queryPineconeOptimized(query, {
      topK: 5,
      threshold: 0.5, // Only return matches with similarity > 0.5
      includeMetadata: true,
    });

    console.log(`📊 Optimized service returned ${result.chunks.length} chunks`);
    console.log(`⏱️ Processing time: ${result.processingTime}ms`);

    if (result.chunks.length === 0) {
      console.log("⚠️ No relevant chunks found with current threshold");
      // Try with lower threshold as fallback
      const fallbackResult = await queryPineconeOptimized(query, {
        topK: 5,
        threshold: 0.3, // Lower threshold for fallback
        includeMetadata: true,
      });
      
      if (fallbackResult.chunks.length === 0) {
        console.log("⚠️ No chunks found even with lower threshold - trying legacy fallback");
        // Use legacy method as final fallback
        const legacyChunks = await queryPineconeAndSearchDocs(query);
        
        if (returnChunks) {
          return res.status(200).json({ chunks: legacyChunks });
        } else {
          if (legacyChunks.length === 0) {
            return res.status(200).json({
              answer: "I couldn't find any relevant information in the documents.",
            });
          }
          const answer = await askGPTWithContext(legacyChunks, query);
          return res.status(200).json({ answer });
        }
      } else {
        console.log(`✅ Fallback found ${fallbackResult.chunks.length} chunks with lower threshold`);
        // Use fallback results
        if (returnChunks) {
          return res.status(200).json({ chunks: fallbackResult.chunks });
        } else {
          const answer = await askGPTWithContext(fallbackResult.chunks, query);
          return res.status(200).json({ answer });
        }
      }
    }

    console.log(`✅ Found ${result.chunks.length} relevant chunks with scores:`, 
      result.scores.map(s => s.toFixed(3)).join(', ')
    );
    console.log("📋 First chunk preview:", result.chunks[0]?.substring(0, 100) + "...");

    // If returnChunks is true, return raw chunks for chat-embed integration
    if (returnChunks) {
      console.log("📤 Returning optimized chunks to chat endpoint");
      return res.status(200).json({ 
        chunks: result.chunks,
        scores: result.scores,
        processingTime: result.processingTime,
      });
    }

    // Otherwise, return full GPT answer (default behavior)
    console.log("🤖 Processing with GPT...");
    const answer = await askGPTWithContext(result.chunks, query);
    console.log("✅ GPT response generated successfully");
    return res.status(200).json({ 
      answer,
      processingTime: result.processingTime,
      chunksUsed: result.chunks.length,
    });
  } catch (err) {
    console.error("❌ Optimized handler error:", err.message || err);
    
    // Fallback to legacy method if optimized service fails completely
    try {
      console.log("🔄 Falling back to legacy Pinecone query...");
      const chunks = await queryPineconeAndSearchDocs(query);
      
      if (returnChunks) {
        return res.status(200).json({ chunks });
      } else {
        if (chunks.length === 0) {
          return res.status(200).json({
            answer: "I couldn't find any relevant information in the documents.",
          });
        }
        const answer = await askGPTWithContext(chunks, query);
        return res.status(200).json({ answer });
      }
    } catch (fallbackErr) {
      console.error("❌ Legacy fallback also failed:", fallbackErr.message);
      return res.status(500).json({ 
        error: "Failed to query knowledge base",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
}
