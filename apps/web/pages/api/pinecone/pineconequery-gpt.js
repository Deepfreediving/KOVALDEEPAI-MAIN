/**
 * 🎯 ENHANCED PINECONE QUERY ENDPOINT WITH KNOWLEDGE INDEX
 * Updated to use enhanced Pinecone service with knowledge index integration
 */

require("dotenv").config();
const { OpenAI } = require("openai");
const { Pinecone } = require("@pinecone-database/pinecone");
import handleCors from "@/utils/handleCors";
import { queryPineconeOptimized } from "@/lib/pineconeService";
import { queryPineconeWithIndex, getMicroClarifier } from "@/lib/pineconeServiceEnhanced";

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

// Enhanced API handler with knowledge index integration
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { query, returnChunks = false } = req.body;
  console.log(`🔍 Enhanced Pinecone endpoint called with query: "${query}" (returnChunks: ${returnChunks})`);

  if (!query || typeof query !== "string") {
    console.log("❌ Invalid query provided");
    return res.status(400).json({ error: "Query must be a string" });
  }

  try {
    console.log("🚀 Using enhanced Pinecone service with knowledge index...");
    
    // Check for micro-clarifier first
    const clarifier = getMicroClarifier(query);
    if (clarifier && !returnChunks) {
      console.log(`💡 Micro-clarifier triggered: ${clarifier}`);
      return res.status(200).json({ 
        answer: clarifier,
        clarification: true 
      });
    }
    
    // Use enhanced service with knowledge index integration
    const result = await queryPineconeWithIndex(query, {
      topK: 8,
      threshold: 0.3,
      confidence: 0.85,
      includeMetadata: true,
    });

    console.log(`📊 Enhanced service returned ${result.chunks.length} chunks`);
    console.log(`⏱️ Processing time: ${result.processingTime}ms`);
    
    if (result.indexMatch) {
      console.log(`🎯 Index match: ${result.indexMatch.title} (canonical: ${result.indexMatch.canonical})`);
    }

    if (result.chunks.length === 0) {
      console.log("⚠️ No relevant chunks found with enhanced service, trying fallback...");
      
      // Fallback to optimized service
      const fallbackResult = await queryPineconeOptimized(query, {
        topK: 5,
        threshold: 0.3,
        includeMetadata: true,
      });
      
      if (returnChunks) {
        return res.status(200).json({ chunks: fallbackResult.chunks });
      } else {
        if (fallbackResult.chunks.length === 0) {
          return res.status(200).json({
            answer: "I couldn't find any relevant information in the documents.",
          });
        }
        const answer = await askGPTWithContext(fallbackResult.chunks, query);
        return res.status(200).json({ answer });
      }
    }

    // If returnChunks is true, return enhanced chunks
    if (returnChunks) {
      console.log("📤 Returning enhanced chunks");
      return res.status(200).json({ 
        chunks: result.chunks,
        scores: result.scores,
        processingTime: result.processingTime,
        indexMatch: result.indexMatch,
        verbatim: result.verbatim
      });
    }

    // Check if we should return verbatim canonical content
    if (result.verbatim && result.botMustSay) {
      console.log("✅ Returning verbatim canonical content");
      
      // Enhanced system prompt for canonical content
      const enhancedSystemPrompt = `You are KovalAI, Daniel Koval's freediving safety assistant. 

CRITICAL INSTRUCTION: The provided content is CANONICAL safety information from Daniel Koval's methodology. You MUST:
1. Quote the exact bullet points or rules as written
2. Include the "Bot Must Say" message verbatim at the end
3. DO NOT add, modify, or rephrase any safety rules
4. DO NOT provide general freediving advice when canonical content exists

When canonical=true, your role is to be a precise messenger of Daniel Koval's specific methodology.`;

      const messages = [
        {
          role: "system",
          content: enhancedSystemPrompt
        },
        {
          role: "user",
          content: `Context (CANONICAL Daniel Koval content):\n${result.chunks.join('\n\n---\n\n')}\n\nUser Question: ${query}\n\nBot Must Say: "${result.botMustSay}"`
        }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.1, // Very low temperature for canonical content
      });

      const answer = response.choices[0].message.content.trim();
      return res.status(200).json({ 
        answer,
        canonical: true,
        indexMatch: result.indexMatch.title,
        botMustSay: result.botMustSay,
        processingTime: result.processingTime
      });
    }

    // Regular GPT processing for non-canonical content
    console.log("🤖 Processing with GPT...");
    const answer = await askGPTWithContext(result.chunks, query);
    console.log("✅ GPT response generated successfully");
    
    return res.status(200).json({ 
      answer,
      processingTime: result.processingTime,
      chunksUsed: result.chunks.length,
      indexMatch: result.indexMatch?.title
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
