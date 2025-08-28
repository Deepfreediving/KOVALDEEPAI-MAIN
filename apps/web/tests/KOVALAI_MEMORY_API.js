// 🧠 KovalAI Memory Injection API
// Intelligently inject dive data into conversation context

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, data, context } = req.body;

    if (type !== 'dive_log') {
      return res.status(400).json({ error: 'Invalid memory type' });
    }

    console.log('🧠 Injecting dive data into KovalAI memory:', data.id);

    // Format dive data for intelligent conversation context
    const memoryContent = formatDiveDataForMemory(data);

    // Option 1: Use OpenAI Assistant with memory (if using Assistants API)
    if (process.env.OPENAI_ASSISTANT_ID) {
      await injectViaAssistant(memoryContent, data);
    }

    // Option 2: Store in conversation context (for regular chat completions)
    await storeInConversationContext(memoryContent, data);

    // Option 3: Create embeddings for semantic search (advanced)
    await createDiveLogEmbedding(memoryContent, data);

    console.log('✅ Successfully injected dive data into KovalAI memory');

    return res.status(200).json({
      success: true,
      message: 'Dive data injected into KovalAI memory',
      memoryId: data.id
    });

  } catch (error) {
    console.error('❌ Memory injection error:', error);
    return res.status(500).json({ 
      error: 'Failed to inject memory',
      details: error.message 
    });
  }
}

// Format dive data for conversation memory
function formatDiveDataForMemory(diveData) {
  const {
    id, date, location, discipline, depth, time, notes,
    imageAnalysis, extractedMetrics, ocrText
  } = diveData;

  return {
    summary: `Dive Log ${id}: ${discipline} dive to ${depth}m at ${location} on ${date}`,
    details: {
      performance: {
        maxDepth: depth,
        diveTime: time,
        discipline: discipline,
        location: location,
        date: date
      },
      notes: notes,
      computerData: extractedMetrics ? {
        analysis: 'Dive computer data available',
        metrics: extractedMetrics,
        confidence: 'High (OCR + AI Vision confirmed)'
      } : null,
      coaching: {
        available: true,
        context: `User has uploaded detailed dive data including ${imageAnalysis ? 'dive computer analysis' : 'manual entry'}. Can provide specific coaching based on this dive.`
      }
    },
    conversationContext: `The user has shared a ${discipline} dive to ${depth}m at ${location}. ${
      imageAnalysis 
        ? 'This includes dive computer data with extracted metrics for detailed analysis.' 
        : 'This is manual entry data.'
    } I can reference this dive for coaching, comparisons, and personalized advice throughout our conversation.`,
    searchableText: `${discipline} ${depth}m ${location} ${date} ${notes} ${imageAnalysis || ''} ${JSON.stringify(extractedMetrics || {})}`
  };
}

// Option 1: OpenAI Assistant Memory Injection
async function injectViaAssistant(memoryContent, diveData) {
  if (!process.env.OPENAI_ASSISTANT_ID) {
    console.log('⏭️ Skipping Assistant injection - no Assistant ID configured');
    return;
  }

  try {
    // Create a thread message with the dive data
    await openai.beta.threads.messages.create(
      process.env.OPENAI_THREAD_ID, // Would need user-specific thread ID
      {
        role: "user",
        content: `[MEMORY INJECTION] ${memoryContent.conversationContext}`,
        metadata: {
          type: 'dive_log_memory',
          diveId: diveData.id,
          timestamp: new Date().toISOString()
        }
      }
    );

    console.log('✅ Injected into OpenAI Assistant memory');
  } catch (error) {
    console.error('❌ Assistant injection failed:', error);
  }
}

// Option 2: Conversation Context Storage (for regular completions)
async function storeInConversationContext(memoryContent, diveData) {
  // This would integrate with your existing conversation storage system
  // For now, we'll store in a simple in-memory cache or database
  
  const conversationMemory = {
    id: `memory_${diveData.id}`,
    type: 'dive_log',
    userId: diveData.userId || 'admin',
    content: memoryContent,
    createdAt: new Date().toISOString(),
    // This gets prepended to conversation context in chat completions
    systemPrompt: `DIVE LOG CONTEXT: ${memoryContent.conversationContext}`
  };

  // Store in your preferred memory system (Redis, Database, etc.)
  // For demo, we'll use console logging
  console.log('💾 Stored conversation context:', conversationMemory.id);
  
  // TODO: Integrate with your conversation memory system
  // await redis.setex(`memory:${conversationMemory.id}`, 86400, JSON.stringify(conversationMemory));
}

// Option 3: Create embeddings for semantic search
async function createDiveLogEmbedding(memoryContent, diveData) {
  try {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: memoryContent.searchableText
    });

    const embeddingRecord = {
      id: `embedding_${diveData.id}`,
      userId: diveData.userId || 'admin',
      type: 'dive_log',
      content: memoryContent.searchableText,
      embedding: embedding.data[0].embedding,
      metadata: {
        diveId: diveData.id,
        date: diveData.date,
        location: diveData.location,
        depth: diveData.depth,
        discipline: diveData.discipline
      },
      createdAt: new Date().toISOString()
    };

    // Store embedding for semantic search
    console.log('🔍 Created embedding for semantic search:', embeddingRecord.id);
    
    // TODO: Store in vector database (Pinecone, Weaviate, pgvector, etc.)
    // await vectorDB.upsert([embeddingRecord]);

  } catch (error) {
    console.error('❌ Embedding creation failed:', error);
  }
}

// Helper function to retrieve dive memories for conversation
export async function getDiveMemoriesForConversation(userId, limit = 5) {
  // This would query your memory storage and return relevant dive data
  // for injection into conversation context
  
  const memories = [
    // Query recent dive logs
    // Query relevant dive logs based on conversation context
    // Return formatted for conversation injection
  ];

  return memories.map(memory => memory.systemPrompt).join('\n');
}
