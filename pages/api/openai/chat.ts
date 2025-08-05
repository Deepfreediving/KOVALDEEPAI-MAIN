import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import handleCors from '@/utils/cors';
import { getNextEQQuestion, evaluateEQAnswers } from '@/lib/coaching/eqEngine';
import getEmbedding from '@/lib/getEmbedding';
import { fetchUserMemory, saveUserMemory } from '@/lib/userMemoryManager';

// ✅ Validate environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not configured');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || '' });
const pinecone = PINECONE_API_KEY ? new Pinecone({ apiKey: PINECONE_API_KEY }) : null;
const index = pinecone && PINECONE_INDEX ? pinecone.index(PINECONE_INDEX) : null;

// ✅ Improved numeric PB parsing with bounds checking
function detectUserLevel(profile: any): 'expert' | 'beginner' {
  try {
    const pbRaw = profile?.pb || profile?.personalBestDepth || 0;
    const numericPB = parseFloat(pbRaw.toString().replace(/[^\d.]/g, '')) || 0;
    const certLevel = (profile?.certLevel || '').toLowerCase();
    const isInstructor = Boolean(profile?.isInstructor);

    if (isInstructor || certLevel.includes('instructor')) return 'expert';
    if (numericPB >= 80 && numericPB <= 300) return 'expert'; // ✅ Added upper bound check
    return 'beginner';
  } catch (error) {
    console.warn('⚠️ Error detecting user level:', error);
    return 'beginner';
  }
}

function getDepthRange(depth: number): string {
  if (!depth || isNaN(depth) || depth < 0) return '10m';
  if (depth > 300) return '100m'; // ✅ Cap extreme values
  const rounded = Math.floor(depth / 10) * 10;
  return `${rounded}m`;
}

// ✅ Enhanced Pinecone query with better error handling
async function queryPinecone(query: string, depthRange: string): Promise<string[]> {
  if (!index) {
    console.warn("⚠️ Pinecone index not initialized.");
    return [];
  }

  if (!query || query.trim().length < 3) {
    console.warn("⚠️ Query too short for Pinecone");
    return [];
  }

  try {
    const vector = await getEmbedding(query);
    if (!Array.isArray(vector) || vector.length === 0) {
      console.warn("⚠️ Invalid embedding vector");
      return [];
    }

    // Primary query with depth filter
    let result: any = await index.query({
      vector,
      topK: 8,
      includeMetadata: true,
      filter: { 
        approvedBy: { "$eq": "Koval" }, 
        depthRange: { "$in": [depthRange, "all"] } 
      },
    });

    // Fallback query without depth filter
    if (!result?.matches?.length) {
      console.log(`ℹ️ No matches for ${depthRange}, trying without depth filter`);
      result = await index.query({
        vector,
        topK: 8,
        includeMetadata: true,
        filter: { approvedBy: { "$eq": "Koval" } },
      });
    }

    const chunks = result?.matches
      ?.map((m: any) => m.metadata?.text)
      .filter((t: string): t is string => typeof t === 'string' && t.length > 15) || [];

    console.log(`✅ Pinecone returned ${chunks.length} relevant chunks`);
    return chunks;

  } catch (err: any) {
    console.error('❌ Pinecone query error:', err.message);
    return [];
  }
}

function generateSystemPrompt(level: 'expert' | 'beginner', depthRange: string): string {
  return `
You are **Koval Deep AI**, a freediving coaching assistant powered by Daniel Koval's real training data.

### 🎯 Rules:
- Provide expert-level freediving coaching advice ONLY from the given Koval knowledge base.
- Do NOT invent information not in context.
- Prioritize safety, progressive depth adaptation, and realistic training goals.
- Tailor tone and advice to a ${level}-level freediver targeting ${depthRange} depths.

### ✅ Response Format:
1️⃣ Physics & Physiology at ${depthRange}  
2️⃣ Technical Analysis  
3️⃣ Targeted Training Plan  
4️⃣ Safety & Strategy  
5️⃣ Motivator Hook

Keep responses under 800 words, actionable, and encouraging.
`;
}

// ✅ Enhanced retry logic with proper error handling
async function askWithContext(
  contextChunks: string[], 
  message: string, 
  userLevel: 'expert' | 'beginner', 
  depthRange: string
): Promise<string> {
  const context = contextChunks.length
    ? contextChunks.slice(0, 5).join('\n\n')
    : "No relevant Koval knowledge found for this query. Reply with 'I don't have specific data on this yet, but I can offer general freediving safety advice.'";

  const systemPrompt = generateSystemPrompt(userLevel, depthRange);

  if (!OPENAI_API_KEY) {
    return "⚠️ OpenAI is not configured. Please check the API settings.";
  }

  let lastError: any = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🤖 OpenAI attempt ${attempt}/${maxAttempts}`);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'system',
            content: `Knowledge Base:\n${context}\n\nOnly answer based on this knowledge. If information is missing, say: "I don't have specific data on this yet."`,
          },
          { role: 'user', content: message },
        ],
      });

      const content = response?.choices?.[0]?.message?.content?.trim();
      
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      console.log(`✅ OpenAI responded successfully on attempt ${attempt}`);
      return content;

    } catch (err: any) {
      lastError = err;
      console.warn(`⚠️ OpenAI attempt ${attempt} failed:`, err.message);

      // Don't retry on certain errors
      if (err.status === 401 || err.status === 403) {
        return "⚠️ Authentication error with OpenAI. Please check API key.";
      }

      if (err.status === 429) {
        return "⚠️ Too many requests. Please wait a moment and try again.";
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`❌ All OpenAI attempts failed. Last error:`, lastError?.message);
  return "⚠️ I'm having trouble responding right now. Please try again in a moment.";
}

// ✅ Safe JSON parsing for profile extraction
async function extractProfileFields(message: string): Promise<Record<string, any>> {
  if (!OPENAI_API_KEY) {
    console.warn('⚠️ Cannot extract profile - OpenAI not configured');
    return {};
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      max_tokens: 300,
      messages: [
        { 
          role: 'system', 
          content: 'Extract freediving profile info from user message. Return valid JSON only with these exact keys: pb, certLevel, focus, isInstructor, discipline, currentDepth. Use null for missing values.' 
        },
        { role: 'user', content: message },
      ],
    });

    let content = response.choices[0].message.content || '{}';
    
    // Clean and extract JSON
    content = content.replace(/```json|```/g, '').trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.log('ℹ️ No profile data found in message');
      return {};
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate extracted data
    const cleaned: Record<string, any> = {};
    if (typeof parsed.pb === 'number' && parsed.pb > 0 && parsed.pb <= 300) cleaned.pb = parsed.pb;
    if (typeof parsed.certLevel === 'string' && parsed.certLevel.length > 0) cleaned.certLevel = parsed.certLevel;
    if (typeof parsed.focus === 'string' && parsed.focus.length > 0) cleaned.focus = parsed.focus;
    if (typeof parsed.isInstructor === 'boolean') cleaned.isInstructor = parsed.isInstructor;
    if (typeof parsed.discipline === 'string' && parsed.discipline.length > 0) cleaned.discipline = parsed.discipline;
    if (typeof parsed.currentDepth === 'number' && parsed.currentDepth > 0 && parsed.currentDepth <= 300) cleaned.currentDepth = parsed.currentDepth;

    console.log(`✅ Extracted profile fields:`, Object.keys(cleaned));
    return cleaned;

  } catch (err: any) {
    console.warn("⚠️ Profile extraction failed:", err.message);
    return {};
  }
}

// ✅ Enhanced memory saving with error handling
async function saveConversationToMemory(
  userId: string, 
  message: string, 
  assistantReply: string, 
  profile: any, 
  eqState: any, 
  sessionId?: string, 
  sessionName?: string
): Promise<boolean> {
  try {
    await saveUserMemory(userId, {
      logs: [{ 
        userMessage: message.slice(0, 1000), // Limit length
        assistantReply: assistantReply.slice(0, 2000), 
        timestamp: new Date().toISOString() 
      }],
      profile,
      eqState,
      sessionId,
      sessionName,
    });
    console.log(`✅ Memory saved for user ${userId}`);
    return true;
  } catch (err: any) {
    console.warn('⚠️ Failed to save user memory:', err.message);
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  
  // ✅ Initialize embedMode with a default value
  let embedMode = false;

  try {
    // ✅ CORS handling
    if (await handleCors(req, res)) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method Not Allowed',
        message: 'Only POST requests are allowed'
      });
    }

    // Input validation
    const { 
      message, 
      userId = 'guest', 
      profile = {}, 
      eqState = {}, 
      diveLogs = [], 
      uploadOnly = false, 
      sessionId, 
      sessionName,
      embedMode: requestEmbedMode = false  // ✅ Rename to avoid conflict
    } = req.body;

    // ✅ Set embedMode for use in catch block
    let embedMode = requestEmbedMode || false; // Initialize embedMode with a default value

    // Validate required fields
    if (!message && !uploadOnly) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message && (typeof message !== 'string' || message.trim().length === 0)) {
      return res.status(400).json({ error: 'Message must be a non-empty string' });
    }

    if (message && message.length > 5000) {
      return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
    }

    // Handle upload-only requests
    if (uploadOnly) {
      return res.status(200).json({
        assistantMessage: { 
          role: 'assistant', 
          content: '✅ Dive images uploaded successfully! I\'ll analyze them when relevant to our conversation.' 
        },
        metadata: { 
          sessionType: 'upload-only',
          processingTime: Date.now() - startTime 
        },
      });
    }

    console.log(`🚀 Processing chat request for user: ${userId}`);

    // Load user memory
    let pastMemory: any = {};
    try {
      pastMemory = await fetchUserMemory(userId) || {};
    } catch (err: any) {
      console.warn('⚠️ Failed to load user memory:', err.message);
    }

    // ✅ Safe profile merging
    let mergedProfile = { ...pastMemory?.profile };
    
    // Merge provided profile
    Object.entries(profile).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        mergedProfile[key] = value;
      }
    });

    // Extract profile from message
    const extractedProfile = await extractProfileFields(message);
    Object.assign(mergedProfile, extractedProfile);

    // Preserve instructor status
    if (pastMemory?.profile?.isInstructor) {
      mergedProfile.isInstructor = true;
    }

    // Determine user characteristics
    const logDepth = Array.isArray(diveLogs) && diveLogs.length 
      ? parseFloat(diveLogs[diveLogs.length - 1]?.reachedDepth || 0) 
      : undefined;
      
    const depthRange = getDepthRange(
      mergedProfile.currentDepth || mergedProfile.pb || logDepth || 10
    );
    const userLevel = detectUserLevel(mergedProfile);

    console.log(`👤 User profile: ${userLevel} level, ${depthRange} range`);

    // Build conversation history
    const historyContext = pastMemory?.logs
      ?.slice(-3)
      .map((l: any) => `User: ${l.userMessage}\nAssistant: ${l.assistantReply}`)
      .join("\n\n") || "";

    // Handle EQ assessments
    if (eqState?.currentDepth) {
      try {
        const followup = getNextEQQuestion(eqState);
        if (followup.type === 'question') {
          return res.status(200).json({ 
            type: 'eq-followup', 
            key: followup.key, 
            question: followup.question,
            metadata: { processingTime: Date.now() - startTime }
          });
        } else if (followup.type === 'diagnosis-ready') {
          const result = evaluateEQAnswers(eqState.answers);
          return res.status(200).json({ 
            type: 'eq-diagnosis', 
            label: result.label, 
            drills: result.drills,
            metadata: { processingTime: Date.now() - startTime }
          });
        }
      } catch (err: any) {
        console.warn("⚠️ EQ assessment failed:", err.message);
      }
    }

    // Build enhanced user context
    let userContext = historyContext ? `${historyContext}\n\nCurrent message: ${message}` : message;
    
    if (Array.isArray(diveLogs) && diveLogs.length > 0) {
      const lastLog = diveLogs[diveLogs.length - 1];
      userContext += `\n\nMost recent dive log: ${JSON.stringify(lastLog)}. Please evaluate this dive and help me progress safely toward ${mergedProfile.targetDepth || 120}m.`;
    }

    // Query knowledge base
    let contextChunks: string[] = [];
    try {
      contextChunks = await queryPinecone(userContext, depthRange);
    } catch (err: any) {
      console.warn("⚠️ Knowledge base query failed:", err.message);
    }

    // Generate AI response
    const assistantReply = await askWithContext(contextChunks, userContext, userLevel, depthRange);

    // Save conversation to memory (only if successful response)
    if (!assistantReply.startsWith("⚠️")) {
      await saveConversationToMemory(
        userId, 
        message, 
        assistantReply, 
        mergedProfile, 
        eqState, 
        sessionId, 
        sessionName
      );
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Chat completed in ${processingTime}ms`);

    return res.status(200).json({
      assistantMessage: { role: 'assistant', content: assistantReply },
      metadata: { 
        userLevel, 
        depthRange, 
        contextChunksCount: contextChunks.length,
        processingTime,
        embedMode  // ✅ Now accessible
      },
    });

  } catch (err: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Fatal error in /api/openai/chat:', err);
    
    // Return proper error status for debugging
    const status = err.status || 500;
    const errorMessage = embedMode  // ✅ Now accessible in catch block
      ? "⚠️ I'm having temporary issues, but I'm still here to help you!"
      : "⚠️ Something went wrong on our end. Please try again in a moment.";

    return res.status(status).json({
      assistantMessage: { role: 'assistant', content: errorMessage },
      metadata: { 
        error: true, 
        processingTime,
        errorType: err.name || 'UnknownError',
        embedMode  // ✅ Now accessible
      },
    });
  }
}

// ✅ Add timeout config
export const config = {
  api: {
    bodyParser: { sizeLimit: '5mb' },
    responseLimit: false,
    timeout: 35000 // 35 seconds (slightly longer than OpenAI timeout)
  }
};
