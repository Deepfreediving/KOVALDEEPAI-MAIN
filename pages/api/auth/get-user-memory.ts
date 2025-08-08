// ===== 📊 pages/api/auth/get-user-memory.ts - UserMemory Query API =====
// Query UserMemory collection for authenticated users

import { NextApiRequest, NextApiResponse } from "next";
import { fetchUserMemory, queryUserMemoryByEmail } from "@/lib/userMemoryManager";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers for Wix integration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email } = req.query;

    // Validate input
    if (!userId && !email) {
      return res.status(400).json({ 
        error: "Either 'userId' or 'email' parameter is required",
        example: "/api/auth/get-user-memory?userId=12345"
      });
    }

    console.log(`🔍 Querying UserMemory for ${userId ? `userId: ${userId}` : `email: ${email}`}`);

    let userMemory = null;

    if (userId) {
      // Primary method: Query by userId
      userMemory = await fetchUserMemory(userId as string);
    } else if (email) {
      // Fallback method: Query by email
      userMemory = await queryUserMemoryByEmail(email as string);
    }

    if (userMemory) {
      console.log("✅ User memory data found");
      return res.status(200).json({
        success: true,
        data: userMemory,
        message: "User memory data retrieved successfully",
        timestamp: new Date().toISOString()
      });
    } else {
      console.log("ℹ️ No user memory data found");
      return res.status(404).json({
        success: false,
        message: "User not found in UserMemory collection",
        userId: userId || null,
        email: email || null,
        suggestion: "User may not have interacted with the system yet"
      });
    }
  } catch (error: any) {
    console.error("❌ Error querying UserMemory collection:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to query user memory",
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
