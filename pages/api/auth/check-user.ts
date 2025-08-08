// ===== 🔐 pages/api/auth/check-user.ts - Authentication Check API =====
// Check user authentication status and return user data

import { NextApiRequest, NextApiResponse } from "next";
import { fetchUserMemory } from "@/lib/userMemoryManager";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers for Wix integration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for authentication in various ways
    
    // 1. Check session/cookies (if implemented)
    // For now, we'll look for userId in headers or query params
    const userId = req.headers['x-user-id'] || req.query.userId;
    
    if (userId && !String(userId).startsWith('guest')) {
      console.log(`🔍 Checking authentication for userId: ${userId}`);
      
      try {
        // Fetch user data from UserMemory
        const userMemoryData = await fetchUserMemory(String(userId));
        
        if (userMemoryData) {
          return res.status(200).json({
            authenticated: true,
            user: {
              id: userMemoryData.userId,
              email: userMemoryData.profile?.loginEmail || "",
              displayName: userMemoryData.profile?.displayName || "User",
              userMemoryData
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.warn("⚠️ Failed to fetch user memory:", error);
      }
    }

    // 2. Check for OAuth tokens (if available)
    try {
      const oauthResponse = await fetch(`${req.headers.host ? 'http://' + req.headers.host : ''}/api/wix/oauth/status`);
      if (oauthResponse.ok) {
        const oauthData = await oauthResponse.json();
        if (oauthData.authenticated) {
          console.log("✅ User authenticated via OAuth");
          return res.status(200).json({
            authenticated: true,
            user: {
              id: `oauth-${Date.now()}`,
              email: "",
              displayName: "OAuth User",
              source: 'oauth'
            },
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.warn("⚠️ OAuth check failed:", error);
    }

    // 3. No authentication found
    console.log("ℹ️ No authentication found");
    return res.status(200).json({
      authenticated: false,
      message: "No active authentication session",
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("❌ Authentication check error:", error);
    return res.status(500).json({
      authenticated: false,
      error: "Authentication check failed",
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
