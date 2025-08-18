// Enhanced Wix Chat Bridge API - Integrates with consolidated master files
// pages/api/wix/chat-bridge.js

import handleCors from "@/utils/handleCors";

export default async function handler(req, res) {
  // Handle CORS
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const startTime = Date.now();

  try {
    const {
      userMessage,
      conversationHistory,
      userId,
      profile,
      embedMode = true,
    } = req.body;

    // Enhanced validation
    if (
      !userMessage ||
      typeof userMessage !== "string" ||
      !userMessage.trim()
    ) {
      return res.status(400).json({
        error: "Valid userMessage required",
        success: false,
      });
    }

    console.log(
      `🌉 Chat bridge request: userId=${userId}, embedMode=${embedMode}`,
    );

    // Use canonical base URL instead of req.headers.origin
    const BASE_URL =
      process.env.NEXTAUTH_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://kovaldeepai-main.vercel.app";

    console.log(`🔗 Using base URL: ${BASE_URL}`);

    // Get user profile for enhanced context
    let userProfile = profile || {};
    if (userId && !userId.startsWith("guest")) {
      try {
        const profileResponse = await fetch(
          `${BASE_URL}/api/wix/user-profile-bridge`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              includeStats: true,
              includePreferences: true,
            }),
          },
        );

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          userProfile = { ...userProfile, ...profileData.profile };
          console.log(
            `👤 Loaded user profile: ${userProfile.displayName || userProfile.nickname || "User"} (${userProfile.isGuest ? "Guest" : "Authenticated"})`,
          );
        }
      } catch (profileError) {
        console.warn("⚠️ Could not load user profile:", profileError.message);
      }
    }

    // Get dive logs for enhanced context
    let diveLogs = [];
    if (userId && !userId.startsWith("guest")) {
      try {
        const diveLogsResponse = await fetch(
          `${BASE_URL}/api/wix/dive-logs-bridge`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, includeAnalysis: true }),
          },
        );

        if (diveLogsResponse.ok) {
          const diveData = await diveLogsResponse.json();
          diveLogs = diveData.diveLogs || [];
          console.log(
            `📊 Loaded ${diveLogs.length} dive logs for enhanced coaching`,
          );
        }
      } catch (diveError) {
        console.warn(
          "⚠️ Could not load dive logs for context:",
          diveError.message,
        );
      }
    }

    // ✅ OPTION 1: Try consolidated Wix chat endpoint (original name)
    try {
      const wixMasterResponse = await fetch(
        "https://www.deepfreediving.com/_functions/http-chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Source": "nextjs-bridge",
            "X-User-Agent": "KovalDeepAI-Widget",
          },
          body: JSON.stringify({
            message: userMessage,
            userId,
            profile: userProfile, // Use enhanced profile data
            embedMode,
            diveLogs: diveLogs.slice(0, 5), // Last 5 dive logs
            conversationHistory: conversationHistory || [],
            version: "v4.0",
          }),
        },
      );

      if (wixMasterResponse.ok) {
        const wixData = await wixMasterResponse.json();
        const processingTime = Date.now() - startTime;

        console.log(
          `✅ Wix master chat response received in ${processingTime}ms`,
        );

        return res.status(200).json({
          aiResponse: wixData.aiResponse || wixData.response || wixData.content,
          success: true,
          source: "wix-master-backend",
          metadata: {
            processingTime,
            diveLogs: diveLogs.length,
            userLevel: wixData.userLevel || "unknown",
          },
        });
      } else {
        console.warn(
          `⚠️ Wix master endpoint returned ${wixMasterResponse.status}`,
        );
      }
    } catch (wixError) {
      console.warn("⚠️ Wix master backend unavailable:", wixError.message);
    }

    // ✅ OPTION 2: Try legacy Wix chat endpoint
    try {
      const wixLegacyResponse = await fetch(
        "https://www.deepfreediving.com/_functions/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage,
            conversationHistory: conversationHistory || [],
            userId,
            profile: userProfile, // Use enhanced profile data
            embedMode,
          }),
        },
      );

      if (wixLegacyResponse.ok) {
        const wixData = await wixLegacyResponse.json();
        const processingTime = Date.now() - startTime;

        console.log(
          `✅ Wix legacy chat response received in ${processingTime}ms`,
        );

        return res.status(200).json({
          aiResponse: wixData.aiResponse || wixData.response,
          success: true,
          source: "wix-legacy-backend",
          metadata: { processingTime, diveLogs: diveLogs.length },
        });
      }
    } catch (wixLegacyError) {
      console.warn(
        "⚠️ Wix legacy backend also unavailable:",
        wixLegacyError.message,
      );
    }

    // ✅ OPTION 3: Fallback to Next.js chat endpoint with enhanced context
    const nextjsResponse = await fetch(
      `${req.headers.origin}/api/openai/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          userId,
          profile: userProfile, // Use enhanced profile data
          embedMode: true,
          diveLogs, // Pass dive logs for context
        }),
      },
    );

    if (nextjsResponse.ok) {
      const nextjsData = await nextjsResponse.json();
      const processingTime = Date.now() - startTime;

      console.log(
        `✅ Next.js fallback response received in ${processingTime}ms`,
      );

      return res.status(200).json({
        aiResponse: nextjsData.assistantMessage?.content || nextjsData.answer,
        success: true,
        source: "nextjs-fallback",
        metadata: {
          processingTime,
          diveLogs: diveLogs.length,
          userLevel: nextjsData.metadata?.userLevel || "unknown",
        },
      });
    }

    throw new Error("All chat endpoints failed");
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Chat bridge error:", error);

    return res.status(500).json({
      error:
        "Chat service temporarily unavailable. Please try again in a moment.",
      aiResponse:
        "⚠️ I'm having technical difficulties right now. Please try again in a moment, and I'll be happy to help with your freediving training!",
      success: false,
      metadata: {
        processingTime,
        errorType: error.name || "UnknownError",
      },
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
    responseLimit: false,
    timeout: 25000,
  },
};
