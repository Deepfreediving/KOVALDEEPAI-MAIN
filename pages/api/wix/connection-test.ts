// ===== 🔗 pages/api/wix/connection-test.ts - Backend Connection Test =====
// Test backend connectivity and provide fallback logic

import { NextApiRequest, NextApiResponse } from "next";

interface ConnectionStatus {
  status: "connected" | "fallback" | "offline";
  timestamp: string;
  details?: string;
  wixConnectionAvailable?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConnectionStatus>,
) {
  // Set CORS headers for Wix integration
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://www.deepfreediving.com",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      status: "offline",
      timestamp: new Date().toISOString(),
      details: "Method not allowed",
    });
  }

  try {
    console.log("🔍 Testing backend connection...");

    // Test 1: Check if Wix connection is available
    const wixConnectionAvailable = false;
    try {
      // This would test the original /_functions/wixConnection endpoint
      // For now, we'll simulate this check
      console.log("📡 Checking Wix backend connection...");

      // You can uncomment this to test the actual Wix endpoint:
      /*
      const wixResponse = await fetch('https://www.deepfreediving.com/_functions/wixConnection', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        }
      });
      
      if (wixResponse.ok) {
        wixConnectionAvailable = true;
        console.log("✅ Wix backend connection successful");
      } else {
        console.warn(`⚠️ Wix backend failed: ${wixResponse.status}`);
      }
      */
    } catch (error) {
      console.warn("⚠️ Wix backend connection failed:", error);
    }

    // Test 2: Check OAuth status
    let oauthAvailable = false;
    try {
      // ✅ FIX: Always use production URL for internal API calls to avoid auth issues
      const baseUrl =
        process.env.BASE_URL || "https://kovaldeepai-main.vercel.app";
      const oauthResponse = await fetch(`${baseUrl}/api/wix/oauth/status`);
      if (oauthResponse.ok) {
        const oauthData = await oauthResponse.json();
        oauthAvailable = oauthData.authenticated;
        console.log(
          `🔐 OAuth status: ${oauthAvailable ? "authenticated" : "not authenticated"}`,
        );
      }
    } catch (error) {
      console.warn("⚠️ OAuth check failed:", error);
    }

    // Test 3: Check UserMemory access
    let userMemoryAvailable = false;
    try {
      // Test with a dummy userId to see if the system responds
      // ✅ FIX: Always use production URL for internal API calls to avoid auth issues
      const baseUrl =
        process.env.BASE_URL || "https://kovaldeepai-main.vercel.app";
      const memoryResponse = await fetch(
        `${baseUrl}/api/auth/get-user-memory?userId=test-connection`,
      );
      userMemoryAvailable = memoryResponse.status !== 500; // Any response except 500 means it's working
      console.log(
        `📊 UserMemory access: ${userMemoryAvailable ? "available" : "unavailable"}`,
      );
    } catch (error) {
      console.warn("⚠️ UserMemory test failed:", error);
    }

    // Determine overall status
    if (wixConnectionAvailable || (oauthAvailable && userMemoryAvailable)) {
      return res.status(200).json({
        status: "connected",
        timestamp: new Date().toISOString(),
        details: "Backend fully operational",
        wixConnectionAvailable,
      });
    } else if (oauthAvailable || userMemoryAvailable) {
      return res.status(200).json({
        status: "fallback",
        timestamp: new Date().toISOString(),
        details: "Limited backend functionality available",
        wixConnectionAvailable,
      });
    } else {
      return res.status(503).json({
        status: "offline",
        timestamp: new Date().toISOString(),
        details: "Backend services unavailable",
        wixConnectionAvailable,
      });
    }
  } catch (error: any) {
    console.error("❌ Backend connection test error:", error);
    return res.status(500).json({
      status: "offline",
      timestamp: new Date().toISOString(),
      details: error.message,
      wixConnectionAvailable: false,
    });
  }
}
