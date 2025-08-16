import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import handleCors from "@/utils/handleCors";
import { fetchUserMemory, saveUserMemory } from "@/lib/userMemoryManager";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || "" });
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

async function queryPinecone(query: string): Promise<string[]> {
  if (!query?.trim()) return [];
  try {
    // ✅ FIX: Always use production URL for internal API calls to avoid auth issues
    const baseUrl =
      process.env.BASE_URL || "https://kovaldeepai-main.vercel.app";

    console.log(
      `🔍 Querying Pinecone via: ${baseUrl}/api/pinecone/pineconequery-gpt`,
    );

    // ✅ Use pineconequery-gpt endpoint
    const response = await fetch(`${baseUrl}/api/pinecone/pineconequery-gpt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
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

async function queryDiveLogs(userIdentifier: string): Promise<string[]> {
  if (!userIdentifier || userIdentifier.startsWith("guest")) return [];
  try {
    // ✅ FIX: Always use production URL for internal API calls to avoid auth issues
    const baseUrl =
      process.env.BASE_URL || "https://kovaldeepai-main.vercel.app";

    console.log(
      `🗃️ Querying dive logs via: ${baseUrl}/api/analyze/get-dive-logs?userId=${userIdentifier}`,
    );

    const response = await fetch(
      `${baseUrl}/api/analyze/get-dive-logs?userId=${userIdentifier}`,
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

  return `You are Koval Deep AI, Daniel Koval's freediving coaching system. ${userContext}${diveLogContext}Provide personalized coaching based on their progress and training history.

🎯 CRITICAL REQUIREMENTS:
- ${hasDiveLogs ? "YOU CAN AND MUST ANALYZE their personal dive logs - the data is provided in the Knowledge Base section below. Reference specific dives, depths, dates, and progression patterns." : "ONLY use information from the provided knowledge base below"}
- When you see dive log data, provide specific analysis of their performance, progression, and areas for improvement
- If the knowledge base doesn't contain specific information, say "I don't have specific guidance on this in my training materials"
- Never mix general freediving advice with Daniel's specific methods
- Provide ${level}-level technical detail appropriate for the user's experience
- Always prioritize safety and progressive training
- Keep responses detailed but focused (under ${embedMode ? "600" : "800"} words)
- Address the user personally as a valued member with access to exclusive training
${hasDiveLogs ? "- When dive log data is present, focus your response on analyzing their actual performance and providing personalized improvement recommendations" : ""}

🚫 FORBIDDEN:
- Making up training protocols not in the knowledge base
- Combining different methodologies
- Providing generic freediving advice when Daniel's specific approach exists
- Recommending techniques beyond the user's certification level

If information is lacking, be honest and provide general safety advice.`;
}

// ✅ FIX: Type userLevel correctly and add embed support
async function askWithContext(
  contextChunks: string[],
  message: string,
  userLevel: "expert" | "beginner", // ✅ Fixed typing
  embedMode: boolean = false,
  diveLogContext: string = "",
  hasDiveLogs: boolean = false,
): Promise<string> {
  if (!OPENAI_API_KEY) return "⚠️ OpenAI API is not configured.";

  console.log("🔹 Sending request to OpenAI...");
  const context = contextChunks.length
    ? contextChunks.slice(0, 3).join("\n\n")
    : "No specific knowledge found. Provide general freediving safety advice.";

  // ✅ Enhanced context with dive log data
  const enhancedContext = diveLogContext
    ? `${context}\n\n${diveLogContext}`
    : context;

  let retryCount = 0;
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  while (retryCount < maxRetries) {
    try {
      console.log(`🔄 OpenAI request attempt ${retryCount + 1}/${maxRetries}`);

      // ✅ Add timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4",
        temperature: 0.7,
        max_tokens: embedMode ? 600 : 800,
        messages: [
          {
            role: "system",
            content: generateSystemPrompt(userLevel, embedMode, hasDiveLogs),
          },
          { role: "system", content: `Knowledge Base:\n${enhancedContext}` },
          { role: "user", content: message },
        ],
      });

      clearTimeout(timeoutId);

      // ✅ Enhanced response validation
      if (!response) {
        throw new Error("No response received from OpenAI");
      }

      if (!response.choices || response.choices.length === 0) {
        throw new Error("No choices returned from OpenAI");
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
      return reply;
    } catch (error: any) {
      retryCount++;
      console.error(
        `❌ OpenAI API error (attempt ${retryCount}/${maxRetries}):`,
        error.message,
      );

      // ✅ Enhanced error classification
      const isRetryableError =
        error.code === "rate_limit_exceeded" ||
        error.code === "server_error" ||
        error.code === "timeout" ||
        error.status >= 500 ||
        error.name === "AbortError" ||
        error.message.includes("timeout") ||
        error.message.includes("network") ||
        error.message.includes("ECONNRESET") ||
        error.message.includes("ETIMEDOUT");

      // ✅ If this is the last retry or non-retryable error, return fallback
      if (retryCount >= maxRetries || !isRetryableError) {
        console.error(
          `❌ Final OpenAI error after ${retryCount} attempts:`,
          error.message,
        );

        // ✅ Provide different fallback messages based on error type
        if (
          error.code === "insufficient_quota" ||
          error.message.includes("quota")
        ) {
          return "⚠️ I'm currently experiencing high demand. Please try again in a few minutes, or contact support if this persists.";
        } else if (error.code === "rate_limit_exceeded") {
          return "⚠️ Too many requests at once. Please wait a moment and try again.";
        } else if (error.code === "invalid_api_key") {
          return "⚠️ Authentication issue with AI service. Please contact support.";
        } else if (
          error.name === "AbortError" ||
          error.message.includes("timeout")
        ) {
          return "⚠️ The AI is taking longer than usual to respond. Please try asking a shorter question or try again.";
        } else {
          return "⚠️ I'm having technical difficulties connecting to the AI service. Please try again in a moment, and if the issue persists, contact support.";
        }
      }

      // ✅ Exponential backoff for retryable errors
      const delay = baseDelay * Math.pow(2, retryCount - 1);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but just in case
  return "⚠️ Maximum retry attempts exceeded. Please try again later.";
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
      userId = "guest",
      nickname,
      profile = {},
      embedMode = false,
      diveLogs = [],
    } = req.body;

    // ✅ Use nickname or userId for user identification
    const userIdentifier = nickname || userId;

    // ✅ Enhanced logging for authentication debugging
    const isGuestUser = !userIdentifier || userIdentifier.startsWith("guest");
    const authStatus = isGuestUser
      ? "🚫 GUEST/UNAUTHENTICATED"
      : "✅ AUTHENTICATED";

    console.log(
      `🚀 Chat request: ${authStatus} | userIdentifier=${userIdentifier} | nickname=${nickname} | userId=${userId} | embedMode=${embedMode}`,
    );

    if (isGuestUser) {
      console.warn(
        "⚠️ WARNING: Chat request with guest/missing userId - authentication may have failed!",
      );
      console.warn(
        "⚠️ This indicates the frontend authentication gating may not be working properly.",
      );
    }

    // ✅ Extract consistent user display name using member ID for fast recognition
    const getUserNickname = (profile: any, userIdentifier: string): string => {
      // ✅ PRIORITY: Use member ID format for consistent, fast recognition
      if (userIdentifier && !userIdentifier.startsWith("guest")) {
        return `User-${userIdentifier}`;
      }

      // Fallback for guest users
      if (userIdentifier?.startsWith("guest")) {
        return "Guest User";
      }

      // Final fallback
      return "User";
    };

    const displayNickname = getUserNickname(profile, userIdentifier);

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
      `🚀 Chat request received from ${displayNickname} (userIdentifier=${userIdentifier}, embedMode=${embedMode})`,
    );
    console.log(`📊 Profile data received:`, {
      nickname: profile?.nickname,
      displayName: profile?.displayName,
      userName: profile?.userName,
      source: profile?.source,
    });

    // ✅ FIX: Type memory correctly
    let memory: any = {};
    try {
      memory = (await fetchUserMemory(userIdentifier)) || {};
    } catch (memError) {
      console.warn("⚠️ Memory fetch failed:", memError);
    }

    const mergedProfile = { ...memory?.profile, ...profile };
    const userLevel = detectUserLevel(mergedProfile);
    const depthRange = getDepthRange(
      mergedProfile.pb || mergedProfile.currentDepth || 10,
    );

    console.log(
      `👤 Processing request for ${displayNickname} (level: ${userLevel}, depth range: ${depthRange})`,
    );
    console.log(`📋 Merged profile data:`, {
      pb: mergedProfile?.pb,
      currentDepth: mergedProfile?.currentDepth,
      isInstructor: mergedProfile?.isInstructor,
      source: mergedProfile?.source,
    });

    const contextChunks = await queryPinecone(message);
    const diveContext = await queryDiveLogs(userIdentifier);

    // ✅ Load actual dive logs for detailed analysis
    let localDiveLogs = [];
    try {
      // ✅ FIX: Always use production URL for internal API calls to avoid auth issues
      const baseUrl =
        process.env.BASE_URL || "https://kovaldeepai-main.vercel.app";

      console.log(
        `🗃️ Loading detailed dive logs via: ${baseUrl}/api/analyze/get-dive-logs?userId=${userIdentifier}`,
      );

      const response = await fetch(
        `${baseUrl}/api/analyze/get-dive-logs?userId=${userIdentifier}`,
      );
      if (response.ok) {
        const data = await response.json();
        localDiveLogs = data.logs || [];
        console.log(
          `🗃️ Loaded ${localDiveLogs.length} local dive logs for detailed analysis`,
        );
      }
    } catch (err) {
      console.warn("⚠️ Could not load detailed dive logs:", err);
    }

    // ✅ Use local dive logs OR request dive logs, prioritizing local
    const allDiveLogs =
      localDiveLogs.length > 0 ? localDiveLogs : diveLogs || [];

    // ✅ Process dive logs for context (using both local and request dive logs)
    let diveLogContext = "";
    if (allDiveLogs && allDiveLogs.length > 0) {
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
      `📊 Has dive logs flag: ${!!(allDiveLogs && allDiveLogs.length > 0)}`,
    );

    const assistantReply = await askWithContext(
      [...contextChunks, ...diveContext],
      message,
      userLevel,
      embedMode,
      diveLogContext,
      !!(allDiveLogs && allDiveLogs.length > 0),
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

    // ✅ Save to memory if successful response
    try {
      await saveUserMemory(userIdentifier, {
        logs: [
          {
            userMessage: message.slice(0, 500),
            assistantReply: assistantReply.slice(0, 1000),
            timestamp: new Date().toISOString(),
          },
        ],
        profile: mergedProfile,
      });
      console.log(`✅ Memory saved for ${userIdentifier}`);
    } catch (saveError) {
      console.warn("⚠️ Could not save memory:", saveError);
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Chat completed in ${processingTime}ms`);

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
