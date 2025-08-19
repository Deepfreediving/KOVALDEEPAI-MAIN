/**
 * ⬆️ SESSION UPGRADE ENDPOINT
 * Upgrades temporary user to authenticated Wix member
 */

import { upgradeTemporaryUserToAuthenticated } from "@/utils/userIdUtils";

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
    const { tempUserId, wixMemberId, sessionId, bufferData } =
      req.body;

    // Validate required fields
    if (!tempUserId || !wixMemberId) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["tempUserId", "wixMemberId"],
      });
    }

    console.log("⬆️ Session upgrade request:", {
      tempUserId,
      wixMemberId: `***${wixMemberId.slice(-4)}`,
      sessionId: sessionId ? `***${sessionId.slice(-8)}` : null,
      bufferItems: bufferData?.length || 0,
    });

    // Step 1: Upgrade user ID and migrate data
    const upgradeResult = await upgradeTemporaryUserToAuthenticated(
      tempUserId,
      wixMemberId,
    );

    if (!upgradeResult.success) {
      throw new Error(upgradeResult.error || "User upgrade failed");
    }

    // Step 2: Process buffered data if any
    let processedBufferItems = 0;
    if (bufferData && bufferData.length > 0) {
      console.log("🔄 Processing buffered data...", bufferData.length, "items");

      for (const bufferedItem of bufferData) {
        try {
          await processBufferedItem(bufferedItem, wixMemberId);
          processedBufferItems++;
        } catch (bufferError) {
          console.warn(
            "⚠️ Failed to process buffered item:",
            bufferedItem.id,
            bufferError,
          );
        }
      }
    }

    // Step 3: Create authenticated session record (for future use)
    // const sessionInfo = {
    //   userId: upgradeResult.newUserId,
    //   wixMemberId,
    //   sessionId,
    //   upgradedFrom: tempUserId,
    //   upgradedAt: new Date().toISOString(),
    //   processedBufferItems,
    //   ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
    // };

    console.log("✅ Session upgrade successful:", {
      tempUserId,
      newUserId: upgradeResult.newUserId,
      wixMemberId: `***${wixMemberId.slice(-4)}`,
      processedBufferItems,
    });

    return res.status(200).json({
      success: true,
      message: "Session upgraded successfully",
      newUserId: upgradeResult.newUserId,
      processedBufferItems,
      migratedData: upgradeResult.migratedData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Session upgrade error:", error);

    return res.status(500).json({
      error: "Session upgrade failed",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Process a single buffered item
 */
async function processBufferedItem(bufferedItem, wixMemberId) {
  const { operation, data } = bufferedItem;

  console.log("🔄 Processing buffered operation:", operation, bufferedItem.id);

  try {
    switch (operation) {
      case "saveDiveLog":
        await processDiveLogSave(data, wixMemberId);
        break;

      case "chatMessage":
        await processChatMessage(data, wixMemberId);
        break;

      case "imageUpload":
        await processImageUpload(data, wixMemberId);
        break;

      default:
        console.warn("⚠️ Unknown buffered operation:", operation);
    }

    console.log("✅ Buffered item processed:", operation, bufferedItem.id);
  } catch (error) {
    console.error(
      "❌ Buffered item processing failed:",
      operation,
      bufferedItem.id,
      error,
    );
    throw error;
  }
}

/**
 * Process buffered dive log save
 */
async function processDiveLogSave(diveLogData, wixMemberId) {
  // Update the dive log data with the authenticated user ID
  const updatedData = {
    ...diveLogData,
    userId: wixMemberId,
    processedFromBuffer: true,
    originalTimestamp: diveLogData.timestamp,
    processedAt: new Date().toISOString(),
  };

  // Call the dive log save API internally
  const saveResponse = await fetch(
    `${process.env.VERCEL_URL || "http://localhost:3000"}/api/analyze/save-dive-log`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedData),
    },
  );

  if (!saveResponse.ok) {
    throw new Error(`Failed to save buffered dive log: ${saveResponse.status}`);
  }

  return await saveResponse.json();
}

/**
 * Process buffered chat message
 */
async function processChatMessage(messageData, wixMemberId) {
  // Update the message data with the authenticated user ID
  // const updatedData = {
  //   ...messageData,
  //   userId: wixMemberId,
  //   processedFromBuffer: true,
  // };

  console.log("💬 Processing buffered chat message for:", wixMemberId);

  // For now, just log it (implement actual chat processing as needed)
  return { processed: true, messageId: messageData.id };
}

/**
 * Process buffered image upload
 */
async function processImageUpload(imageData, wixMemberId) {
  // Update the image data with the authenticated user ID
  // const updatedData = {
  //   ...imageData,
  //   userId: wixMemberId,
  //   processedFromBuffer: true,
  // };

  console.log("🖼️ Processing buffered image upload for:", wixMemberId);

  // For now, just log it (implement actual image processing as needed)
  return { processed: true, imageId: imageData.id };
}
