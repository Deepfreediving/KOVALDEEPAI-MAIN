/**
 * 🤝 VERCEL HANDSHAKE ENDPOINT
 * Establishes connection and validates session for Koval AI
 */

// CORS configuration for Wix domain
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.deepfreediving.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400", // 24 hours
  "Cross-Origin-Embedder-Policy": "unsafe-none",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Cross-Origin-Opener-Policy": "unsafe-none",
};

export default async function handler(req, res) {
  // Add CORS headers to all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, wixMemberId, sessionId, timestamp, userAgent } = req.body;

    // Validate required fields
    if (!userId || !sessionId) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["userId", "sessionId"],
      });
    }

    // Log handshake attempt
    console.log("🤝 Vercel handshake request:", {
      userId,
      wixMemberId: wixMemberId ? `***${wixMemberId.slice(-4)}` : null,
      sessionId: `***${sessionId.slice(-8)}`,
      timestamp: new Date(timestamp).toISOString(),
      userAgent: userAgent?.substring(0, 50) + "...",
      ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
    });

    // Perform system health check
    const systemStatus = await performSystemHealthCheck();

    // Generate session token (simple implementation)
    const sessionToken = generateSessionToken(userId, sessionId);

    // Store session info (in production, use proper database)
    const sessionInfo = {
      userId,
      wixMemberId,
      sessionId,
      sessionToken,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      userAgent,
      systemStatus,
    };

    // In production, store this in your database
    // For now, we'll just validate and respond

    console.log("✅ Vercel handshake successful for:", userId);

    return res.status(200).json({
      success: true,
      message: "Handshake successful",
      sessionToken,
      systemStatus,
      timestamp: new Date().toISOString(),
      connectionId: `conn_${Date.now()}`,
    });
  } catch (error) {
    console.error("❌ Vercel handshake error:", error);

    return res.status(500).json({
      error: "Handshake failed",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Perform basic system health check
 */
async function performSystemHealthCheck() {
  try {
    // Check OpenAI API availability
    const openaiHealth = await checkOpenAIHealth();

    // Check Wix API availability (if configured)
    const wixHealth = await checkWixHealth();

    return {
      openai: openaiHealth,
      wix: wixHealth,
      vercel: true, // If we're running, Vercel is healthy
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("⚠️ System health check partial failure:", error);
    return {
      openai: false,
      wix: false,
      vercel: true,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Check OpenAI API health
 */
async function checkOpenAIHealth() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return false;
    }

    // Simple ping to OpenAI (you might want to implement a lightweight check)
    return true; // Assuming healthy if API key exists
  } catch (error) {
    console.warn("⚠️ OpenAI health check failed:", error);
    return false;
  }
}

/**
 * Check Wix API health
 */
async function checkWixHealth() {
  try {
    if (!process.env.WIX_CLIENT_ID || !process.env.WIX_CLIENT_SECRET) {
      return false;
    }

    // Simple check (implement actual Wix API ping if needed)
    return true; // Assuming healthy if credentials exist
  } catch (error) {
    console.warn("⚠️ Wix health check failed:", error);
    return false;
  }
}

/**
 * Generate a simple session token
 */
function generateSessionToken(userId, sessionId) {
  const payload = {
    userId,
    sessionId,
    timestamp: Date.now(),
  };

  // In production, use proper JWT signing
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}
