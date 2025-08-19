// ===== 📊 pages/api/monitoring/error.ts - Error Monitoring API =====
// Collect and log errors for debugging production issues

import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

interface ErrorReport {
  type: string;
  message: string;
  stack?: string;
  timestamp: string;
  url: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Set CORS headers for cross-origin error reporting
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const errorData: ErrorReport = req.body;

    // Validate error data
    if (!errorData.type || !errorData.message) {
      return res.status(400).json({
        error: "Missing required fields: type and message",
      });
    }

    // Enhance error data with server info
    const enhancedError = {
      ...errorData,
      serverTimestamp: new Date().toISOString(),
      userAgent: req.headers["user-agent"] || "Unknown",
      ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      referer: req.headers.referer || "Unknown",
    };

    // Log to console for immediate visibility
    console.error(`🚨 Client Error Report:`, {
      type: enhancedError.type,
      message: enhancedError.message,
      url: enhancedError.url,
      timestamp: enhancedError.timestamp,
      userId: enhancedError.userId || "anonymous",
    });

    // Save to error log file (for development/debugging)
    try {
      const errorLogPath = path.join(process.cwd(), "error-logs.json");
      let existingErrors = [];

      if (fs.existsSync(errorLogPath)) {
        const fileContent = fs.readFileSync(errorLogPath, "utf-8");
        existingErrors = JSON.parse(fileContent);
      }

      // Keep only last 100 errors to prevent file bloat
      existingErrors.push(enhancedError);
      if (existingErrors.length > 100) {
        existingErrors = existingErrors.slice(-100);
      }

      fs.writeFileSync(errorLogPath, JSON.stringify(existingErrors, null, 2));
    } catch (fileError) {
      console.warn("⚠️ Failed to save error to file:", fileError);
    }

    // Here you could send to external monitoring services like:
    // - Sentry
    // - LogRocket
    // - DataDog
    // - Custom analytics endpoint

    return res.status(200).json({
      success: true,
      message: "Error reported successfully",
      errorId: `error-${Date.now()}`,
    });
  } catch (error: any) {
    console.error("❌ Error monitoring endpoint failed:", error);
    return res.status(500).json({
      error: "Failed to process error report",
      details: error.message,
    });
  }
}
