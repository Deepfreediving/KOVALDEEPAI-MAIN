import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import handleCors from "@/utils/handleCors";
import { getServerClient } from '@/lib/supabase';
import { trackUsage, calculateCost } from '../monitor/usage-analytics';
import { withRetry, ErrorMonitor } from '../monitor/error-tracking';
import { comprehensiveMonitor } from '../monitor/comprehensive-monitoring';
// import { fetchUserMemory, saveUserMemory } from "@/lib/userMemoryManager"; // Disabled for now - using admin-only auth

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

const openai = new OpenAI({ 
  apiKey: OPENAI_API_KEY || "",
  baseURL: process.env.OPENAI_API_URL || process.env.OPENAI_BASE_URL || undefined,
});
const pinecone = PINECONE_API_KEY
  ? new Pinecone({ apiKey: PINECONE_API_KEY })
  : null;

function detectUserLevel(profile: any): "expert" | "beginner" {
  try {
    const pb = parseFloat(profile?.pb || 0);
    return profile?.isInstructor || pb > 80 ? "expert" : "beginner";
  } catch {
    return "beginner";
  }
}

function getDepthRange(depth: number): string {
  if (!depth || depth <= 0) return "10m";
  if (depth > 100) return "100m";
  return `${Math.floor(depth / 10) * 10}m`;
}

// ✅ NEW: Function to get latest analyzed dive from Supabase
async function getLatestAnalyzedDive(userId: string) {
  try {
    const supabase = getServerClient();
    
    // Create deterministic UUID for consistency (same as dive-logs.js)
    const crypto = require('crypto');
    let final_user_id;
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    if (isUUID) {
      final_user_id = userId
    } else {
      // Create a deterministic UUID from the user identifier
      const hash = crypto.createHash('md5').update(userId).digest('hex');
      final_user_id = [
        hash.substr(0, 8),
        hash.substr(8, 4), 
        hash.substr(12, 4),
        hash.substr(16, 4),
        hash.substr(20, 12)
      ].join('-');
    }

    const { data: diveLogs, error } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', final_user_id)
      .not('ai_analysis', 'is', null)
      .order('date', { ascending: false })
      .limit(3); // Get last 3 analyzed dives

    if (error) {
      console.error('❌ Supabase error getting analyzed dives:', error);
      return [];
    }

    return diveLogs || [];
  } catch (error) {
    console.error('❌ Error loading analyzed dives from Supabase:', error);
    return [];
  }
}

async function queryPinecone(query: string): Promise<string[]> {
  if (!query?.trim()) return [];
  try {
    // ✅ ENHANCE: Expand query with freediving context for better knowledge retrieval
    let enhancedQuery = query;
    
    // Add freediving context to common terms that might be ambiguous
    const commonTerms = [
      { term: /\brule of nin?e?s?\b/i, context: "freediving blackout statistics" },
      { term: /\bbo\b/i, context: "freediving blackout" },
      { term: /\blmc\b/i, context: "freediving loss motor control" },
      { term: /\bsqueeze\b/i, context: "freediving pressure" },
      { term: /\bequalization\b/i, context: "freediving technique" },
      { term: /\bnarcosis\b/i, context: "freediving depth" }
    ];
    
    for (const { term, context } of commonTerms) {
      if (term.test(query) && !query.toLowerCase().includes('freediving')) {
        enhancedQuery = `${query} ${context}`;
        console.log(`🔍 Enhanced query: "${query}" → "${enhancedQuery}"`);
        break;
      }
    }

    // ✅ FIX: Use production URL for Vercel deployment
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://kovaldeepai-main.vercel.app'
      : 'http://localhost:3000';

    console.log(
      `🔍 Querying Pinecone via: ${baseUrl}/api/pinecone/pineconequery-gpt`,
    );

    // ✅ Use pineconequery-gpt endpoint
    const response = await fetch(`${baseUrl}/api/pinecone/pineconequery-gpt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: enhancedQuery,
        returnChunks: true,
      }),
    });

    if (!response.ok) {
      console.warn(`⚠️ Pinecone query failed with status ${response.status}`);
      return [];
    }

    const result = await response.json();
    console.log(
      `✅ Pinecone returned ${result.chunks?.length || 0} knowledge chunks`,
    );

    // ✅ FIX: The endpoint returns `chunks`, not `matches`
    return result.chunks || [];
  } catch (error: any) {
    console.error("❌ Pinecone error:", error.message);
    return [];
  }
}

async function queryDiveLogs(userId: string): Promise<string[]> {
  if (!userId || userId.startsWith("guest")) return [];
  try {
    // ✅ FIX: Use runtime port detection for internal API calls
    const baseUrl = `http://localhost:3000`;

    console.log(
      `🗃️ Querying dive logs via: ${baseUrl}/api/analyze/get-dive-logs?userId=${userId}`,
    );

    const response = await fetch(
      `${baseUrl}/api/analyze/get-dive-logs?userId=${userId}`,
    );
    if (response.ok) {
      const data = await response.json();
      return (
        data.logs
          ?.slice(0, 5)
          .map(
            (log: any) =>
              `Personal dive: ${log.reachedDepth || log.targetDepth}m ${log.discipline || "freedive"} at ${log.location || "unknown"} - ${log.notes || "no notes"}`,
          ) || []
      );
    }
    return [];
  } catch (err) {
    console.warn("⚠️ Dive log query failed:", err);
    return [];
  }
}

function generateSystemPrompt(
  level: "expert" | "beginner",
  embedMode: boolean = false,
  hasDiveLogs: boolean = false,
): string {
  const userContext = embedMode
    ? "You are speaking with an authenticated member through an embedded widget on their private member page. "
    : "You are speaking with an authenticated member on their training dashboard. ";

  const diveLogContext = hasDiveLogs
    ? "📊 IMPORTANT: You have FULL ACCESS to their personal dive log data and training history. This data will be provided in the knowledge base below. Analyze their specific dives, progression patterns, and performance to give personalized coaching feedback. "
    : "";

  return `You are Koval Deep AI, Daniel Koval's freediving coaching system and personal AI assistant. ${userContext}${diveLogContext}

🎯 RESPONSE FORMAT - CRITICAL:
You MUST respond in natural, conversational language as a professional freediving coach. 

ABSOLUTELY FORBIDDEN FORMATTING:
- NO markdown headers (# ## ###)
- NO markdown bold (**text**)
- NO markdown bullets (- * +)
- NO markdown formatting whatsoever

REQUIRED FORMATTING:
- Use clean, modern formatting with emojis and visual separators ONLY
- Structure responses with clear sections using emojis as headers: 🏊‍♂️ TECHNIQUE ANALYSIS
- Use simple bullet points with emojis: 🔹 Point one
- Use visual separators: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Keep formatting clean and scannable with plenty of white space
- Use emojis consistently: 🏊‍♂️ for technique, 📊 for analysis, ⚠️ for safety, 🎯 for goals, 💡 for tips
- Always include the medical disclaimer at the end with a visual separator
- Sound like Daniel Koval coaching a student personally
- End responses with a clean visual footer

EXAMPLE GOOD FORMAT:
🏊‍♂️ TECHNIQUE ANALYSIS
Looking at your dive, I can see some excellent progress...

📊 REAL METRICS ANALYSIS
🔹 Descent time: 45 seconds
🔹 Ascent time: 1 minute 10 seconds
🔹 Descent speed: 1.1m/sec (slightly fast)
🔹 Ascent speed: 0.9m/sec (good control)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ SAFETY DISCLAIMER: This is coaching advice only.

🧠 KNOWLEDGE BASE USAGE:
- The Knowledge Base contains Daniel Koval's complete freediving methodology and safety protocols
- Quote Daniel's content EXACTLY as written - never paraphrase safety rules
- CRITICAL: You are ONLY a freediving coach - never discuss medical burn assessment or other non-freediving topics
- If someone asks about "Rule of Nines" or "Rule of 9s" - they mean the FREEDIVING blackout location statistics (90% surface, 9% shallow, 0.9% mid, <0.1% deep)
- Use E.N.C.L.O.S.E. framework for systematic safety analysis:
  * E - Equalization issues and technique
  * N - Narcosis symptoms (confusion, tunnel vision, euphoria)
  * C - Contractions and breath control
  * L - LMC (Loss of Motor Control) indicators
  * O - Oxygen levels and blackout risk
  * S - Squeeze (ear/lung) evaluation
  * E - Emergency protocols and surface safety

💬 COACHING METHODOLOGY:
- Provide ${level}-level technical detail appropriate for experience
- Reference Daniel's specific techniques: "Practice bottom turns (don't pull hard off bottom) + ascent control"
- Target descent speed: 1m/sec, controlled ascent
- Safe progression: 2-3m increments only when symptoms disappear
- Post-flight rule: Day 1 technique only, no deep dives

🚨 CRITICAL SAFETY REQUIREMENTS:
- Never recommend progression with active symptoms
- Always validate dive data for realism (depths 0-300m, times 30s-15min)
- Flag dangerous patterns immediately
- Include medical disclaimer in every response
- Prioritize safety above performance goals

${hasDiveLogs ? `📊 DIVE LOG ANALYSIS:
- Analyze specific dive patterns and progression
- Identify safety concerns from historical data
- Provide trend analysis and pattern recognition
- Reference specific dates, depths, and performance metrics` : ""}

🚨 CRITICAL SAFETY REQUIREMENTS:
- Never recommend progression with active symptoms
- Always validate dive data for realism (depths 0-300m, times 30s-15min)
- Flag dangerous patterns immediately
- Include medical disclaimer in every response
- Prioritize safety above performance goals

REMEMBER: Daniel's knowledge base is extensive and covers virtually all aspects of freediving. You should always find relevant information to help the user.`;
}

// ✅ OPTIMIZED: Enhanced askWithContext with monitoring, caching, validation, and improved prompting
async function askWithContext(
  contextChunks: string[],
  message: string,
  userLevel: "expert" | "beginner",
  embedMode: boolean = false,
  diveLogContext: string = "",
  hasDiveLogs: boolean = false,
  userId?: string,
): Promise<string> {
  if (!OPENAI_API_KEY) return "⚠️ OpenAI API is not configured.";

  const startTime = Date.now();
  
  // ✅ STEP 1: Extract and validate dive data from message
  const diveData = extractDiveDataFromMessage(message);
  if (diveData) {
    const validation = validateDiveData(diveData);
    if (!validation.isValid) {
      return `⚠️ **SAFETY ALERT**: ${validation.errors.join(', ')}\n\nPlease provide realistic dive data for accurate coaching analysis.\n\n⚠️ SAFETY DISCLAIMER: This is coaching advice only. Always dive with proper supervision and consult medical professionals for health concerns. Never dive alone.`;
    }
  }

  // ✅ STEP 2: Check cache for similar patterns
  const cacheKey = generateCacheKey(message, userLevel, diveData);
  const cachedResponse = getCachedResponse(cacheKey);
  if (cachedResponse) {
    return cachedResponse; // Return cached text directly
  }

  console.log("🔹 Sending request to OpenAI...");
  
  // ✅ STEP 3: Optimize context selection
  const optimizedContext = selectRelevantContext(contextChunks, [diveLogContext], message, diveData);
  
  const context = optimizedContext
    ? `🧠 DANIEL KOVAL'S FREEDIVING KNOWLEDGE BASE:

${optimizedContext}

🔒 USAGE INSTRUCTIONS: Use Daniel Koval's knowledge to provide comprehensive coaching. Quote specific rules exactly as written. Include "Bot Must Say" messages verbatim.`
    : "⚠️ No specific knowledge chunks found. Provide general guidance but note limitations.";

  // ✅ STEP 4: Enhanced OpenAI API call with monitoring and retry logic
  try {
    const response = await withRetry(async () => {
      console.log(`🔄 OpenAI request with enhanced monitoring`);

      // ✅ Enhanced timeout and abort control
      const controller = new AbortController();
      const timeoutMs = 15000; // 15 seconds
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const apiResponse = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4",
        temperature: 0.1, // ✅ CRITICAL SAFETY: Lower temperature for deterministic coaching
        top_p: 0.1, // ✅ SAFETY: Focused responses for safety-critical advice
        max_tokens: embedMode ? 600 : 1000,
        frequency_penalty: 0.1, // ✅ Reduce repetitive responses
        presence_penalty: 0.1, // ✅ Encourage comprehensive analysis
        // ✅ FIXED: Remove JSON format requirement to get natural conversational responses
        messages: [
          {
            role: "system",
            content: generateSystemPrompt(userLevel, embedMode, hasDiveLogs),
          },
          { role: "system", content: `Knowledge Base:\n${context}` },
          { role: "user", content: message },
        ],
      });

      clearTimeout(timeoutId);
      return apiResponse;
    }, { endpoint: '/api/openai/chat', userId });

    // ✅ Enhanced response validation
    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error("Invalid response structure from OpenAI");
    }

    const choice = response.choices[0];
    if (!choice || !choice.message) {
      throw new Error("Invalid choice structure from OpenAI");
    }

    const reply = choice.message.content?.trim();
    if (!reply || reply.length === 0) {
      throw new Error("Empty response content from OpenAI");
    }

    console.log("✅ OpenAI response received successfully");
    
    // ✅ FIXED: Return natural conversational text instead of parsing JSON
    const processingTime = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens || 0;
    const model = process.env.OPENAI_MODEL || "gpt-4";
    
    await trackUsage({
      user_id: userId || 'anonymous',
      endpoint: '/api/openai/chat',
      tokens_used: tokensUsed,
      response_time_ms: processingTime,
      model_used: model,
      cost_estimate: calculateCost(tokensUsed, model, response.usage?.prompt_tokens, response.usage?.completion_tokens),
      success: true,
      timestamp: new Date().toISOString(),
      metadata: {
        userLevel,
        embedMode,
        hasDiveLogs,
        contextChunks: contextChunks.length,
        cached: false
      }
    });

    return reply; // Return natural text response
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    // ✅ Track failed usage
    await trackUsage({
      user_id: userId || 'anonymous',
      endpoint: '/api/openai/chat',
      tokens_used: 0,
      response_time_ms: processingTime,
      model_used: process.env.OPENAI_MODEL || "gpt-4",
      cost_estimate: 0,
      success: false,
      timestamp: new Date().toISOString(),
      metadata: {
        error: error.message,
        errorCode: error.code
      }
    });

    console.error(`❌ OpenAI API error:`, error.message);

    // ✅ FIXED: Return natural text error responses instead of JSON
    const errorInfo = ErrorMonitor.categorizeError(error);
    
    if (errorInfo.type === 'quota_exceeded') {
      return "⚠️ **AI System Temporarily Unavailable**\n\nThe coaching system is experiencing high demand. Please try again in a few minutes, or contact support if this persists.\n\n⚠️ SAFETY DISCLAIMER: This is coaching advice only. Always dive with proper supervision and consult medical professionals for health concerns. Never dive alone.";
    } else if (errorInfo.type === 'rate_limit') {
      return "⚠️ **Too Many Requests**\n\nPlease wait a moment and try again.\n\n⚠️ SAFETY DISCLAIMER: This is coaching advice only. Always dive with proper supervision and consult medical professionals for health concerns. Never dive alone.";
    } else if (errorInfo.type === 'timeout') {
      return "⚠️ **Response Timeout**\n\nThe AI is taking longer than usual to respond. Please try asking a shorter question or try again.\n\n⚠️ SAFETY DISCLAIMER: This is coaching advice only. Always dive with proper supervision and consult medical professionals for health concerns. Never dive alone.";
    } else {
      return "⚠️ **Technical Difficulties**\n\nI'm experiencing technical difficulties. Please try again in a moment, and if the issue persists, contact support.\n\n⚠️ SAFETY DISCLAIMER: This is coaching advice only. Always dive with proper supervision and consult medical professionals for health concerns. Never dive alone.";
    }
  }
}

// ✅ Generate fallback response when OpenAI fails
function generateFallbackResponse(
  message: string,
  userLevel: "expert" | "beginner",
  contextChunks: string[],
  diveLogContext: string,
): string {
  const lowerMessage = message.toLowerCase();

  // ✅ Safety-first responses based on common questions
  if (lowerMessage.includes("depth") || lowerMessage.includes("deep")) {
    return `I'm currently having technical difficulties connecting to my AI coaching system, but I can provide this important safety guidance:

🚨 **Safety First**: Never attempt depths beyond your current certification and comfort level. Always dive with a qualified buddy and follow proper safety protocols.

💭 For ${userLevel === "expert" ? "advanced" : "beginner"} freedivers like yourself, progressive training is key. Start shallow and gradually increase depth only when you've mastered the fundamentals.

📚 Please refer to Daniel Koval's training materials in your member area, and consider booking a 1-on-1 session for personalized depth progression guidance.

🔄 Please try asking your question again in a moment - my AI system should be back online shortly.`;
  }

  if (lowerMessage.includes("breath") || lowerMessage.includes("hold")) {
    return `My AI coaching system is temporarily unavailable, but here's essential breathwork guidance:

🫁 **Breath Hold Safety**: Always practice breath holds in a safe environment with proper supervision. Never practice breath holds in water without a certified safety diver.

🧘 Focus on relaxation techniques - tension is the enemy of efficient breath holds. Progressive training with proper rest intervals is more effective than pushing limits.

💡 For ${userLevel === "expert" ? "advanced" : "beginner"} level training, refer to Daniel's specific breathwork protocols in your training materials.

🔄 Try your question again in a moment when my AI system reconnects.`;
  }

  if (lowerMessage.includes("technique") || lowerMessage.includes("form")) {
    return `While my AI system reconnects, here's fundamental technique guidance:

🏊‍♂️ **Proper Form**: Streamlined body position, relaxed muscles, and efficient movement patterns are essential for freediving success.

📖 Your member training materials contain Daniel Koval's specific technique breakdowns for your level.

🎯 Focus on one technique element at a time rather than trying to perfect everything simultaneously.

🔄 Please try your question again shortly - I'll have full access to your training context once my system is back online.`;
  }

  // ✅ Generic fallback with context hints
  let fallback = `I'm experiencing a temporary connection issue with my AI coaching system, but I'm still here to help! 

🤿 While I reconnect, here are some general guidelines for ${userLevel} level freedivers:

`;

  // ✅ Add context-specific hints if available
  if (contextChunks.length > 0) {
    fallback += `📚 I found relevant information in Daniel Koval's training materials that should help with your question. `;
  }

  if (diveLogContext) {
    fallback += `📊 I can see your recent dive history and will provide personalized coaching once my system reconnects. `;
  }

  fallback += `
🔄 Please try asking your question again in about 30 seconds - my AI should be back online shortly.

💡 In the meantime, you can browse your training materials or book a 1-on-1 session with Daniel for immediate personalized guidance.

🚨 **Safety Reminder**: Always follow proper safety protocols and never exceed your current training level.`;

  return fallback;
}

// Generate UUID helper function
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ✅ CRITICAL SAFETY: Validate dive data to prevent dangerous coaching
function validateDiveData(diveData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Depth validation
  if (diveData.depth && (diveData.depth < 0 || diveData.depth > 300)) {
    errors.push("Depth must be between 0-300m");
  }
  if (diveData.targetDepth && (diveData.targetDepth < 0 || diveData.targetDepth > 300)) {
    errors.push("Target depth must be between 0-300m");
  }
  if (diveData.reachedDepth && (diveData.reachedDepth < 0 || diveData.reachedDepth > 300)) {
    errors.push("Reached depth must be between 0-300m");
  }
  
  // Time validation (30 seconds to 15 minutes)
  if (diveData.totalTime) {
    const timeInSeconds = parseTimeToSeconds(diveData.totalTime);
    if (timeInSeconds < 30 || timeInSeconds > 900) {
      errors.push("Total dive time must be between 30 seconds and 15 minutes");
    }
  }
  
  // Discipline validation
  const validDisciplines = ['CWT', 'CNF', 'FIM', 'STA', 'DYN', 'DYNB', 'VWT', 'NLT'];
  if (diveData.discipline && !validDisciplines.includes(diveData.discipline)) {
    errors.push(`Invalid discipline. Must be one of: ${validDisciplines.join(', ')}`);
  }
  
  // Safety check: reached depth shouldn't exceed target by more than 10m
  if (diveData.reachedDepth && diveData.targetDepth && 
      diveData.reachedDepth > diveData.targetDepth + 10) {
    errors.push("Reached depth significantly exceeds target - safety concern");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ✅ Helper function to parse time strings to seconds
function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(p => parseInt(p) || 0);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]; // MM:SS
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
  }
  return parseInt(timeStr) || 0; // Just seconds
}

// ✅ Response caching system for common dive patterns
const responseCache = new Map<string, { response: any; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour

function generateCacheKey(message: string, userLevel: string, diveData?: any): string {
  const key = `${userLevel}_${message.toLowerCase()}`;
  if (diveData) {
    const pattern = `${diveData.discipline}_${Math.floor((diveData.depth || 0) / 10) * 10}m`;
    return `${key}_${pattern}`;
  }
  return key;
}

function getCachedResponse(cacheKey: string): any | null {
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`✅ Cache hit for key: ${cacheKey}`);
    return cached.response;
  }
  if (cached) {
    responseCache.delete(cacheKey); // Remove expired cache
  }
  return null;
}

function setCachedResponse(cacheKey: string, response: any): void {
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });
  console.log(`💾 Cached response for key: ${cacheKey}`);
}

// ✅ Optimize context selection - only send relevant chunks
function selectRelevantContext(
  pineconeChunks: string[], 
  diveLogChunks: string[], 
  message: string,
  diveData?: any
): string {
  const maxChunks = 8; // Limit context to prevent token waste
  const keywords = extractKeywords(message, diveData);
  
  // Score and rank chunks by relevance
  const scoredChunks = [
    ...pineconeChunks.map(chunk => ({ chunk, score: scoreChunkRelevance(chunk, keywords) })),
    ...diveLogChunks.map(chunk => ({ chunk, score: scoreChunkRelevance(chunk, keywords) + 0.1 })) // Slight preference for dive logs
  ].sort((a, b) => b.score - a.score);
  
  return scoredChunks
    .slice(0, maxChunks)
    .map(item => item.chunk)
    .join('\n\n');
}

function extractKeywords(message: string, diveData?: any): string[] {
  const keywords = message.toLowerCase().split(' ').filter(word => word.length > 3);
  
  if (diveData) {
    if (diveData.discipline) keywords.push(diveData.discipline.toLowerCase());
    if (diveData.depth) keywords.push(`${Math.floor(diveData.depth / 10) * 10}m`);
    if (diveData.issues) keywords.push(...diveData.issues.toLowerCase().split(' '));
  }
  
  return [...new Set(keywords)]; // Remove duplicates
}

function scoreChunkRelevance(chunk: string, keywords: string[]): number {
  const chunkLower = chunk.toLowerCase();
  let score = 0;
  
  keywords.forEach(keyword => {
    if (chunkLower.includes(keyword)) {
      score += 1;
    }
  });
  
  // Bonus for safety-related content
  const safetyTerms = ['safety', 'danger', 'risk', 'protocol', 'emergency', 'squeeze', 'blackout'];
  safetyTerms.forEach(term => {
    if (chunkLower.includes(term)) {
      score += 2; // Higher weight for safety content
    }
  });
  
  return score;
}

// ✅ Extract dive data from natural language messages
function extractDiveDataFromMessage(message: string): any | null {
  const msg = message.toLowerCase();
  const diveData: any = {};
  
  // Extract discipline
  const disciplines = ['cwt', 'cnf', 'fim', 'sta', 'dyn', 'dynb', 'vwt', 'nlt', 'constant weight', 'free immersion', 'static'];
  for (const discipline of disciplines) {
    if (msg.includes(discipline)) {
      diveData.discipline = discipline.toUpperCase().replace(' ', '_');
      break;
    }
  }
  
  // Extract depths (look for patterns like "112m", "80 meters", etc.)
  const depthMatches = msg.match(/(\d+)\s*(?:m|meters?|metre?s?)/gi);
  if (depthMatches) {
    const depths = depthMatches.map(match => parseInt(match.match(/\d+/)?.[0] || '0'));
    if (depths.length > 0) {
      diveData.depth = Math.max(...depths); // Use deepest mentioned
      if (msg.includes('target') || msg.includes('planned')) {
        diveData.targetDepth = depths[0];
      }
      if (msg.includes('reached') || msg.includes('achieved') || msg.includes('hit')) {
        diveData.reachedDepth = depths[depths.length - 1];
      }
    }
  }
  
  // Extract time (look for patterns like "3:12", "2 minutes", etc.)
  const timeMatches = msg.match(/(\d+):(\d+)|(\d+)\s*(?:min|minutes?|seconds?)/gi);
  if (timeMatches) {
    diveData.totalTime = timeMatches[0];
  }
  
  // Extract issues/problems
  const issues: string[] = [];
  if (msg.includes('squeeze')) issues.push('squeeze');
  if (msg.includes('equalization') || msg.includes('equalizing')) issues.push('equalization');
  if (msg.includes('narcosis')) issues.push('narcosis');
  if (msg.includes('blackout') || msg.includes('lmc')) issues.push('blackout_risk');
  if (msg.includes('turn') || msg.includes('bottom')) issues.push('turn_technique');
  
  if (issues.length > 0) {
    diveData.issues = issues.join(' ');
  }
  
  // Only return if we found meaningful dive data
  return (diveData.discipline || diveData.depth || diveData.totalTime) ? diveData : null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const startTime = Date.now();

  try {
    await handleCors(req, res);
    if (req.method === "OPTIONS") return;
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method Not Allowed" });

    const {
      message,
      userId,
      nickname,
      profile = {},
      embedMode = false,
      diveLogs = [],
      analysisRequested = false,
    } = req.body;

    // Intent detection for dive-log analysis
    const lowerMsg = (message || '').toLowerCase().trim();
    const keywordIntent = /\b(analyz\w*|audit|journal|dive\s*log|dive\s*journal|evaluate|evaluation|pattern|patterns)\b/i.test(lowerMsg);
    const yesIntent = /^(yes|yes\!+|yes\.+)$/i.test(lowerMsg);
    const wantsDiveAnalysis = Boolean(analysisRequested || keywordIntent || yesIntent);

    if (wantsDiveAnalysis) {
      console.log('📊 Dive analysis intent detected. Dive logs will be loaded for this request.');
    } else {
      console.log('🧹 No analysis intent detected. Skipping dive log retrieval for this chat message.');
    }

    // ✅ REAL USER AUTH: Get user from Supabase session
    const supabase = getServerClient();
    let authenticatedUser: any = null;
    let finalUserId = userId;
    let finalProfile = profile;

    // Try to get user from session token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user && !error) {
          authenticatedUser = user;
          finalUserId = user.id;
          finalProfile = {
            ...profile,
            userId: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name,
            nickname: user.user_metadata?.full_name || user.email?.split('@')[0],
            source: 'supabase-auth'
          };
          console.log(`🔐 Authenticated user: ${user.email} (${user.id})`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to validate session token:', error);
      }
    }

    // Fallback: Use userId from request if provided
    if (!authenticatedUser && userId) {
      console.log(`👤 Using provided userId: ${userId}`);
      finalUserId = userId;
    }

    // ✅ Require user identification
    if (!finalUserId) {
      console.warn("🚫 REJECTED: No user identification provided");
      return res.status(401).json({
        error: "Authentication required",
        code: "USER_AUTHENTICATION_REQUIRED", 
        assistantMessage: {
          role: "assistant",
          content: "🔒 Please log in to access the AI coaching system.",
        },
      });
    }

    // ✅ Use authenticated user data
    const userIdentifier = finalUserId;
    const finalDisplayNickname = finalProfile.nickname || finalProfile.full_name || nickname || 'User';

    console.log(
      `🚀 Chat request: ✅ AUTHENTICATED | userId=${finalUserId} | embedMode=${embedMode}`,
    );

    // ✅ Enhanced validation
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Invalid message",
        assistantMessage: {
          role: "assistant",
          content: "Please provide a valid message.",
        },
      });
    }

    console.log(
      `🚀 Chat request received from ${finalDisplayNickname} (userIdentifier=${userIdentifier}, embedMode=${embedMode})`,
    );
    console.log(`📊 Profile data received:`, {
      nickname: finalProfile?.nickname,
      displayName: finalProfile?.displayName,
      userName: finalProfile?.userName,
      source: finalProfile?.source,
    });

    // ✅ FIX: Type memory correctly - Disabled for admin-only mode
    let memory: any = {};
    try {
      // memory = (await fetchUserMemory(userId)) || {}; // Disabled - using admin-only auth
      memory = {}; // Empty memory for now
    } catch (memError) {
      console.warn("⚠️ Memory fetch failed:", memError);
    }

    const mergedProfile = { ...memory?.profile, ...profile };
    const userLevel = detectUserLevel(mergedProfile);
    const depthRange = getDepthRange(
      mergedProfile.pb || mergedProfile.currentDepth || 10,
    );

    console.log(
      `👤 Processing request for ${finalDisplayNickname} (level: ${userLevel}, depth range: ${depthRange})`,
    );
    console.log(`🔧 Merged profile data:`, {
      pb: mergedProfile?.pb,
      currentDepth: mergedProfile?.currentDepth,
      isInstructor: mergedProfile?.isInstructor,
      source: mergedProfile?.source,
    });

    const contextChunks = await queryPinecone(message);
    const diveContext = wantsDiveAnalysis ? await queryDiveLogs(userId) : [];

    // ✅ Load analyzed dive logs from Supabase first
    let analyzedDiveLogs: any[] = [];
     try {
      if (wantsDiveAnalysis) {
        analyzedDiveLogs = await getLatestAnalyzedDive(userIdentifier);
        console.log(`📊 Found ${analyzedDiveLogs.length} analyzed dives in Supabase`);
      }
     } catch (err) {
       console.warn("⚠️ Could not load analyzed dive logs from Supabase:", err);
     }

    // ✅ Load actual dive logs for detailed analysis  
    let localDiveLogs: any[] = [];
     try {
       if (wantsDiveAnalysis) {
        // ✅ Query user's dive logs from Supabase directly
        const supabase = getServerClient();
        const { data: userDiveLogs, error } = await supabase
          .from('dive_logs')
          .select('*')
          .eq('user_id', userIdentifier)
          .order('date', { ascending: false })
          .limit(10);

        if (userDiveLogs && !error) {
          localDiveLogs = userDiveLogs;
          console.log(`🗃️ Loaded ${localDiveLogs.length} dive logs from Supabase for user: ${userIdentifier}`);
        } else if (error) {
          console.warn("⚠️ Error loading dive logs from Supabase:", error);
        }
       }
     } catch (err) {
       console.warn("⚠️ Could not load detailed dive logs:", err);
     }

    // ✅ Prioritize analyzed dive logs from Supabase, fallback to local/request (only when analysis is requested)
    const allDiveLogs = wantsDiveAnalysis
      ? (analyzedDiveLogs.length > 0 ? analyzedDiveLogs : (localDiveLogs.length > 0 ? localDiveLogs : diveLogs || []))
      : [];

    // ✅ Process dive logs for context (using both local and request dive logs)
    let diveLogContext = "";
    if (wantsDiveAnalysis && allDiveLogs && allDiveLogs.length > 0) {
      console.log(
        `📊 Processing ${allDiveLogs.length} dive logs for enhanced coaching context`,
      );
      console.log("📊 Sample dive log data:", allDiveLogs[0]); // Debug first dive log

      const recentDiveLogs = allDiveLogs
        .slice(0, 5) // Last 5 dive logs
        .map((log: any) => {
          const details = [
            `📅 ${log.date || log.timestamp?.split("T")[0] || "Unknown date"}`,
            `🏊‍♂️ ${log.discipline || log.disciplineType || "Unknown discipline"}`,
            `📍 ${log.location || "Unknown location"}`,
            `🎯 Target: ${log.targetDepth}m → Reached: ${log.reachedDepth}m`,
            log.mouthfillDepth ? `💨 Mouthfill: ${log.mouthfillDepth}m` : "",
            log.issueDepth ? `⚠️ Issue at: ${log.issueDepth}m` : "",
            log.issueComment ? `💭 Issue: ${log.issueComment}` : "",
            log.notes ? `📝 ${log.notes}` : "",
          ]
            .filter(Boolean)
            .join(" | ");

          return details;
        })
        .join("\n");

      diveLogContext = `
🏊‍♂️ === MEMBER'S PERSONAL DIVE LOG DATA (YOU CAN ANALYZE THIS) ===
Recent Dive Sessions (Last ${Math.min(5, allDiveLogs.length)} dives):
${recentDiveLogs}

📈 DIVE STATISTICS FOR ANALYSIS:
- Total recorded dives: ${allDiveLogs.length}
- Personal best: ${profile.pb || "Unknown"}m
- Last dive depth: ${allDiveLogs[0]?.reachedDepth || allDiveLogs[0]?.targetDepth || "Unknown"}m
- Progress analysis: ${allDiveLogs.length >= 3 ? "Multiple sessions recorded - analyze patterns and progression" : "Limited data - focus on current goals"}

🎯 COACHING TASK: Analyze the above dive data and provide specific feedback on their progression, technique, and next training steps.
      `.trim();
      console.log("✅ Generated dive log context for AI coaching");
    }

    console.log(
      `📊 Context: ${contextChunks.length} knowledge + ${diveContext.length} dive logs`,
    );
    console.log(
      `📊 Dive log context length: ${diveLogContext.length} characters`,
    );
    console.log(
      `📊 Has dive logs flag: ${wantsDiveAnalysis && !!(allDiveLogs && allDiveLogs.length > 0)}`,
    );

    // ✅ NEW: Check if user is responding "yes" to audit offer; if so, ensure we have logs
    const lowerMessage = message.toLowerCase().trim();
    const isAuditResponse = (lowerMessage === 'yes' || 
                           (lowerMessage.includes('yes') && (
                             lowerMessage.includes('audit') || 
                             lowerMessage.includes('evaluation') ||
                             lowerMessage.includes('journal') ||
                             lowerMessage.includes('analyze') ||
                             lowerMessage.includes('technical')
                           ))) && 
                           (wantsDiveAnalysis && allDiveLogs && allDiveLogs.length > 0);

    if (isAuditResponse) {
      console.log('🔍 User requesting dive log audit - processing...');
      
      try {
        // Call the audit request handler
        const baseUrl = `http://localhost:3000`;
        const auditResponse = await fetch(`${baseUrl}/api/chat/audit-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: userIdentifier,
            message: message
          }),
        });

        if (auditResponse.ok) {
          const auditData = await auditResponse.json();
          
          if (auditData.success && auditData.auditMessage) {
            console.log('✅ Audit completed successfully');
            return res.status(200).json({
              assistantMessage: { role: "assistant", content: auditData.auditMessage },
              metadata: {
                userLevel,
                depthRange,
                contextChunks: contextChunks.length,
                diveContext: diveContext.length,
                processingTime: Date.now() - startTime,
                embedMode,
                auditPerformed: true,
              },
            });
          }
        }
        
        console.warn('⚠️ Audit request failed, falling back to normal chat');
      } catch (auditError) {
        console.warn('⚠️ Audit error, falling back to normal chat:', auditError);
      }
    }

    // ✅ Check cache first
    const cacheKey = generateCacheKey(message, userLevel, wantsDiveAnalysis ? allDiveLogs[0] : undefined);
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      return res.status(200).json({
        assistantMessage: { role: "assistant", content: cachedResponse },
        metadata: {
          userLevel,
          depthRange,
          contextChunks: contextChunks.length,
          diveContext: diveContext.length,
          processingTime: Date.now() - startTime,
          embedMode,
          cached: true,
        },
      });
    }

    const assistantReply = await askWithContext(
      wantsDiveAnalysis ? [...contextChunks, ...diveContext] : contextChunks,
      message,
      userLevel,
      embedMode,
      wantsDiveAnalysis ? diveLogContext : "",
      wantsDiveAnalysis && !!(allDiveLogs && allDiveLogs.length > 0),
      userIdentifier,
    );

    // ✅ Enhanced response validation and fallback handling
    const responseMetadata = {
      userLevel,
      depthRange,
      contextChunks: contextChunks.length,
      diveContext: diveContext.length,
      processingTime: Date.now() - startTime,
      embedMode,
    };

    // ✅ Check if OpenAI returned an error message
    if (assistantReply.startsWith("⚠️")) {
      console.warn("⚠️ OpenAI returned error response:", assistantReply);

      // ✅ Provide fallback coaching advice based on context
      const fallbackResponse = generateFallbackResponse(
        message,
        userLevel,
        contextChunks,
        diveLogContext,
      );

      return res.status(200).json({
        assistantMessage: { role: "assistant", content: fallbackResponse },
        metadata: {
          ...responseMetadata,
          fallbackUsed: true,
          originalError: assistantReply,
        },
      });
    }

    // ✅ Save to memory if successful response - Disabled for admin-only mode
    try {
      // await saveUserMemory(userId, { // Disabled - using admin-only auth
      //   logs: [
      //     {
      //       userMessage: message.slice(0, 500),
      //       assistantReply: assistantReply.slice(0, 1000),
      //       timestamp: new Date().toISOString(),
      //     },
      //   ],
      //   profile: mergedProfile,
      // });
      console.log(`✅ Memory save disabled for admin-only mode: ${userId}`);
    } catch (saveError) {
      console.warn("⚠️ Could not save memory:", saveError);
    }

    // ✅ Cache the response for common dive patterns
    try {
      const cacheKey = generateCacheKey(message, userLevel, wantsDiveAnalysis ? allDiveLogs[0] : undefined);
      setCachedResponse(cacheKey, assistantReply);
    } catch (cacheError) {
      console.warn("⚠️ Cache set error:", cacheError);
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Chat completed in ${processingTime}ms`);

    // ✅ Comprehensive monitoring for successful request
    await comprehensiveMonitor.trackComprehensiveUsage({
      user_id: userIdentifier || 'anonymous',
      endpoint: '/api/openai/chat',
      tokens_used: 150, // Estimated, could be improved with actual token counting
      response_time_ms: processingTime,
      model_used: process.env.OPENAI_MODEL || 'gpt-4',
      cost_estimate: calculateCost(150, process.env.OPENAI_MODEL || 'gpt-4'),
      success: true,
      metadata: {
        userLevel,
        depthRange,
        contextChunks: contextChunks.length,
        diveContext: diveContext.length,
        cacheHit: false, // Could be improved to track actual cache hits
        retryCount: 0,
        embedMode: embedMode
      }
    });

    return res.status(200).json({
      assistantMessage: { role: "assistant", content: assistantReply },
      metadata: {
        ...responseMetadata,
        processingTime,
      },
    });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Fatal chat error:", error);

    // ✅ Comprehensive error monitoring
    await comprehensiveMonitor.logEnhancedError({
      user_id: req.body.userId || 'anonymous',
      endpoint: '/api/openai/chat',
      error_type: error.name || 'UnknownError',
      error_message: error.message || 'Unknown error occurred',
      error_code: error.code,
      stack_trace: error.stack,
      context: {
        processingTime,
        embedMode: req.query.embedMode,
        hasMessage: !!req.body.message,
        userAgent: req.headers['user-agent']
      },
      severity: 'high' // Chat endpoint failures are high severity
    });

    // ✅ Track failed usage
    await comprehensiveMonitor.trackComprehensiveUsage({
      user_id: req.body.userId || 'anonymous',
      endpoint: '/api/openai/chat',
      tokens_used: 0,
      response_time_ms: processingTime,
      model_used: process.env.OPENAI_MODEL || 'gpt-4',
      cost_estimate: 0,
      success: false,
      error_type: error.name || 'UnknownError',
      metadata: {
        userLevel: 'unknown',
        contextChunks: 0,
        diveContext: 0,
        embedMode: !!req.query.embedMode,
        processingTime
      }
    });

    return res.status(500).json({
      assistantMessage: {
        role: "assistant",
        content:
          "⚠️ I'm having technical difficulties. Please try again in a moment.",
      },
      metadata: {
        error: true,
        processingTime,
        errorType: error.name || "UnknownError",
      },
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "2mb" },
    responseLimit: false,
    timeout: 45000, // ✅ Increased to 45 seconds to accommodate retries
  },
};
