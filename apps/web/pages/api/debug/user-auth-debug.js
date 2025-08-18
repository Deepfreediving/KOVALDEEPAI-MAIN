// Debug endpoint to check user authentication status
// /api/debug/user-auth-debug

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { userId, source, timestamp } = req.query;

  console.log("🔍 User Auth Debug:", {
    userId,
    source,
    timestamp,
    isGuest: userId?.startsWith("guest"),
    hasUserId: !!userId,
    headers: req.headers,
  });

  const debugInfo = {
    timestamp: new Date().toISOString(),
    receivedUserId: userId,
    isGuestUser: userId?.startsWith("guest"),
    hasAuthenticatedUser: userId && !userId.startsWith("guest"),
    source: source || "unknown",
    requestMethod: req.method,
    userAgent: req.headers["user-agent"],
    origin: req.headers.origin,
    referer: req.headers.referer,
  };

  // Check if this is a real user or guest
  if (!userId) {
    debugInfo.status = "NO_USER_ID";
    debugInfo.message = "No user ID provided - authentication required";
  } else if (userId.startsWith("guest")) {
    debugInfo.status = "GUEST_USER_DETECTED";
    debugInfo.message = "Guest user detected - but platform is members-only";
    debugInfo.action = "REQUIRE_AUTHENTICATION";
  } else {
    debugInfo.status = "AUTHENTICATED_USER";
    debugInfo.message = "Real user ID detected";
    debugInfo.action = "PROCEED_WITH_FEATURES";
  }

  console.log("📊 User Auth Debug Result:", debugInfo);

  res.status(200).json({
    success: true,
    debug: debugInfo,
    recommendations: {
      forGuests: "Admin-only access",
      forAuthenticated: "Load user data and enable all features",
      nextSteps: [
        "Check admin authentication",
        "Verify user permissions",
        "Load personalized data",
      ],
    },
  });
}
