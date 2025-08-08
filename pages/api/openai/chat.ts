import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import handleCors from '@/utils/handleCors';
import { fetchUserMemory, saveUserMemory } from '@/lib/userMemoryManager';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

// 🔍 AUDIT: Environment validation
function validateEnvironment(): string[] {
  const issues: string[] = [];
  
  if (!OPENAI_API_KEY) issues.push('OPENAI_API_KEY missing');
  if (!PINECONE_API_KEY) issues.push('PINECONE_API_KEY missing');
  if (!PINECONE_INDEX) issues.push('PINECONE_INDEX missing');
  
  console.log('🔧 ENVIRONMENT CHECK:', {
    OPENAI_API_KEY: OPENAI_API_KEY ? '✅ Set' : '❌ Missing',
    PINECONE_API_KEY: PINECONE_API_KEY ? '✅ Set' : '❌ Missing',
    PINECONE_INDEX: PINECONE_INDEX ? '✅ Set' : '❌ Missing',
    VERCEL_URL: process.env.VERCEL_URL ? '✅ Set' : '⚠️ Using localhost'
  });
  
  return issues;
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || '' });
const pinecone = PINECONE_API_KEY ? new Pinecone({ apiKey: PINECONE_API_KEY }) : null;

function detectUserLevel(profile: any): 'expert' | 'beginner' {
  try {
    const pb = parseFloat(profile?.pb || 0);
    return profile?.isInstructor || pb > 80 ? 'expert' : 'beginner';
  } catch {
    return 'beginner';
  }
}

function getDepthRange(depth: number): string {
  if (!depth || depth <= 0) return '10m';
  if (depth > 100) return '100m';
  return `${Math.floor(depth / 10) * 10}m`;
}

async function queryPinecone(query: string): Promise<string[]> {
  if (!query?.trim()) {
    console.log('⚠️ PINECONE: Empty query, skipping');
    return [];
  }
  
  console.log(`🔍 QUERYING PINECONE with: "${query}"`);
  
  try {
    // ✅ FIX: Use dynamic port detection
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : `http://localhost:3000`; // ✅ Fixed to use correct port

    const url = `${baseUrl}/api/pinecone/query`;
    console.log(`📡 PINECONE API URL: ${url}`);

    // ✅ Use working pinecone endpoint
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        returnChunks: true
      })
    });

    console.log(`📡 PINECONE API Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`⚠️ PINECONE API Error: ${response.status} - ${errorText}`);
      console.log('📚 PINECONE: Using fallback - no context from knowledge base');
      return []; // ✅ Graceful fallback instead of failing
    }

    const result = await response.json();
    console.log(`📦 PINECONE RAW RESULT:`, JSON.stringify(result, null, 2));
    
    const chunks = result.matches?.map((m: any) => m.metadata?.text).filter(Boolean) || [];
    console.log(`✅ PINECONE PROCESSED: ${chunks.length} text chunks extracted`);
    
    return chunks;
  } catch (error: any) {
    console.warn('⚠️ Pinecone error (using fallback):', error.message);
    console.log('📚 PINECONE: System will continue with general knowledge only');
    return []; // ✅ Graceful fallback
  }
}

async function queryDiveLogs(userId: string): Promise<string[]> {
  if (!userId || userId.startsWith('guest')) {
    console.log('⚠️ DIVE LOGS: Skipping for guest user');
    return [];
  }
  
  console.log(`🔍 QUERYING DIVE LOGS for userId: ${userId}`);
  
  try {
    // ✅ FIX: Use dynamic port detection
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : `http://localhost:3000`; // ✅ Fixed to use correct port
    
    const url = `${baseUrl}/api/analyze/get-dive-logs?userId=${userId}`;
    console.log(`📡 DIVE LOGS API URL: ${url}`);
    
    const response = await fetch(url);
    console.log(`📡 DIVE LOGS API Response Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`📦 DIVE LOGS RAW DATA:`, JSON.stringify(data, null, 2));
      
      const logs = data.logs?.slice(0, 5).map((log: any) =>
        `Personal dive: ${log.reachedDepth || log.targetDepth}m ${log.discipline || 'freedive'} at ${log.location || 'unknown'} - ${log.notes || 'no notes'}`
      ) || [];
      
      console.log(`✅ DIVE LOGS PROCESSED: ${logs.length} logs converted to context`);
      return logs;
    } else {
      const errorText = await response.text();
      console.error(`❌ DIVE LOGS API Error: ${response.status} - ${errorText}`);
      return [];
    }
  } catch (err) {
    console.error('❌ Dive log query failed:', err);
    return [];
  }
}

function generateSystemPrompt(level: 'expert' | 'beginner'): string {
  return `You are Koval Deep AI, a freediving coach powered by Daniel Koval's training expertise.

🎯 Guidelines:
- Provide ${level}-level freediving advice based on available knowledge and personal data
- Focus on safety, technique, and progressive training
- Keep responses under 600 words
- Be encouraging and practical

If information is lacking, be honest and provide general safety advice.`;
}

async function askWithContext(
  contextChunks: string[], 
  message: string, 
  userLevel: 'expert' | 'beginner'  // ✅ Fixed typing
): Promise<string> {
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI API KEY MISSING');
    return "⚠️ OpenAI API is not configured.";
  }

  console.log("🔹 Sending request to OpenAI...");
  console.log(`📊 Context chunks provided: ${contextChunks.length}`);
  
  const context = contextChunks.length
    ? contextChunks.slice(0, 3).join('\n\n')
    : "No specific knowledge found. Provide general freediving safety advice.";

  console.log(`📝 CONTEXT SENT TO OPENAI (${context.length} chars):`, context.substring(0, 200) + '...');

  try {
    // ✅ Try GPT-4o first, then fallback to GPT-3.5-turbo
    const models = ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'];
    let response;
    let usedModel = '';

    for (const model of models) {
      try {
        console.log(`🤖 TRYING MODEL: ${model}`);
        
        const requestPayload = {
          model: model,
          temperature: 0.7,
          max_tokens: 800,
          messages: [
            { role: 'system' as const, content: generateSystemPrompt(userLevel) },
            { role: 'system' as const, content: `Knowledge Base:\n${context}` },
            { role: 'user' as const, content: message }
          ]
        };
        
        console.log('🤖 OPENAI REQUEST PAYLOAD:', JSON.stringify(requestPayload, null, 2));

        response = await openai.chat.completions.create(requestPayload);
        usedModel = model;
        console.log(`✅ SUCCESS WITH MODEL: ${model}`);
        break;
      } catch (modelError: any) {
        console.warn(`⚠️ Model ${model} failed:`, modelError.message);
        if (model === models[models.length - 1]) {
          throw modelError; // Re-throw if it's the last model
        }
        continue;
      }
    }
    
    console.log('🤖 OPENAI RAW RESPONSE:', JSON.stringify(response, null, 2));

    const reply = response?.choices?.[0]?.message?.content?.trim() || "⚠️ No response generated.";
    console.log("✅ OpenAI response received");
    console.log(`📝 FINAL REPLY (${reply.length} chars) using ${usedModel}:`, reply.substring(0, 200) + '...');
    
    return reply;

  } catch (error: any) {
    console.error('❌ OpenAI API error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    });
    return "⚠️ There was an error reaching OpenAI.";
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();

  try {
    // 🔍 AUDIT: Validate environment first
    const envIssues = validateEnvironment();
    if (envIssues.length > 0) {
      console.error('❌ ENVIRONMENT ISSUES:', envIssues);
      return res.status(500).json({
        assistantMessage: { 
          role: 'assistant', 
          content: `⚠️ Server configuration issues: ${envIssues.join(', ')}` 
        },
        metadata: { error: true, envIssues }
      });
    }

    await handleCors(req, res);
    if (req.method === 'OPTIONS') return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { message, userId = 'guest', profile = {}, embedMode = false } = req.body;
    
    // 🔍 AUDIT: Enhanced request debugging
    console.log('🔍 FULL REQUEST BODY:', JSON.stringify(req.body, null, 2));
    console.log(`🚀 Chat request received from userId=${userId}`);
    console.log('👤 Profile received:', JSON.stringify(profile, null, 2));
    
    // ✅ Enhanced validation
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ 
        error: 'Invalid message',
        assistantMessage: { role: 'assistant', content: 'Please provide a valid message.' }
      });
    }

    // 🔍 AUDIT: Check if we have a real user ID vs guest
    if (userId === 'guest' || userId.startsWith('guest-')) {
      console.warn('⚠️ GUEST USER DETECTED - No personalized data will be available');
    } else {
      console.log('✅ AUTHENTICATED USER - Will fetch personalized data');
    }

    // ✅ FIX: Type memory correctly
    let memory: any = {};
    try { 
      console.log('🔍 FETCHING USER MEMORY for userId:', userId);
      memory = await fetchUserMemory(userId) || {}; 
      console.log('📦 MEMORY FETCHED:', JSON.stringify(memory, null, 2));
    } catch (memError) {
      console.error('❌ Memory fetch failed:', memError);
    }

    const mergedProfile = { ...memory?.profile, ...profile };
    console.log('🔄 MERGED PROFILE:', JSON.stringify(mergedProfile, null, 2));
    
    const userLevel = detectUserLevel(mergedProfile);
    const depthRange = getDepthRange(mergedProfile.pb || mergedProfile.currentDepth || 10);

    console.log(`👤 User: ${userLevel} level, ${depthRange} target`);

    // 🔍 AUDIT: Enhanced context gathering with detailed logging
    console.log('🔍 STARTING CONTEXT GATHERING...');
    const contextChunks = await queryPinecone(message);
    console.log(`📚 PINECONE CONTEXT: ${contextChunks.length} chunks found`);
    if (contextChunks.length > 0) {
      console.log('📝 Sample context:', contextChunks[0]?.substring(0, 100) + '...');
    }

    const diveContext = await queryDiveLogs(userId);
    console.log(`🏊 DIVE LOGS CONTEXT: ${diveContext.length} logs found`);
    if (diveContext.length > 0) {
      console.log('📝 Sample dive log:', diveContext[0]);
    }

    console.log(`📊 Context: ${contextChunks.length} knowledge + ${diveContext.length} dive logs`);

    // 🔍 AUDIT: Enhanced OpenAI interaction with context validation
    console.log('🤖 PREPARING OPENAI REQUEST...');
    console.log(`📝 Message to OpenAI: "${message}"`);
    console.log(`👤 User Level: ${userLevel}`);
    console.log(`🎯 Depth Range: ${depthRange}`);
    
    // Validate context before sending to OpenAI
    const totalContext = [...contextChunks, ...diveContext];
    console.log(`📋 TOTAL CONTEXT ITEMS: ${totalContext.length}`);
    
    if (totalContext.length === 0) {
      console.warn('⚠️ NO CONTEXT AVAILABLE - OpenAI will use general knowledge only');
    }

    const assistantReply = await askWithContext(totalContext, message, userLevel);
    
    console.log(`🤖 OPENAI RESPONSE LENGTH: ${assistantReply.length} characters`);
    console.log(`🤖 OPENAI RESPONSE PREVIEW: ${assistantReply.substring(0, 150)}...`);

    // ✅ Save to memory if successful response
    if (!assistantReply.startsWith("⚠️")) {
      console.log('💾 SAVING CONVERSATION TO MEMORY...');
      try {
        const memoryData = {
          logs: [{
            userMessage: message.slice(0, 500),
            assistantReply: assistantReply.slice(0, 1000),
            timestamp: new Date().toISOString()
          }],
          profile: mergedProfile
        };
        
        console.log('💾 MEMORY DATA TO SAVE:', JSON.stringify(memoryData, null, 2));
        
        await saveUserMemory(userId, memoryData);
        console.log(`✅ Memory saved successfully for ${userId}`);
      } catch (saveError) {
        console.error('❌ Could not save memory:', saveError);
      }
    } else {
      console.warn('⚠️ Skipping memory save due to error response');
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Chat completed in ${processingTime}ms`);

    // 🔍 AUDIT: Enhanced response with debugging metadata
    const responseData = {
      assistantMessage: { role: 'assistant', content: assistantReply },
      metadata: { 
        userLevel, 
        depthRange, 
        contextChunks: contextChunks.length, 
        diveContext: diveContext.length, 
        processingTime, 
        embedMode,
        // Additional debugging info
        userId: userId,
        profileReceived: Object.keys(profile).length > 0,
        memoryFetched: Object.keys(memory).length > 0,
        totalContextItems: contextChunks.length + diveContext.length
      }
    };
    
    console.log('📤 SENDING RESPONSE:', JSON.stringify(responseData, null, 2));

    return res.status(200).json(responseData);

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Fatal chat error:', error);
    
    return res.status(500).json({ 
      assistantMessage: { 
        role: 'assistant', 
        content: "⚠️ I'm having technical difficulties. Please try again in a moment." 
      }, 
      metadata: { 
        error: true, 
        processingTime,
        errorType: error.name || 'UnknownError'
      }
    });
  }
}

export const config = { 
  api: { 
    bodyParser: { sizeLimit: '2mb' }, 
    responseLimit: false, 
    timeout: 30000 
  } 
};
