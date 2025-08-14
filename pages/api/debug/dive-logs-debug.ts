import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs/promises";
import path from "path";
import handleCors from "@/utils/handleCors";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (handleCors(req, res)) return;

    const { userId } = req.query;

    console.log(`🔍 DEBUG: Checking dive logs for userId: ${userId}`);

    const result: {
      userId: string | string[] | undefined;
      timestamp: string;
      localStorageCheck: string | null;
      fileSystemCheck: string | null;
      logs: any[];
      errors: string[];
    } = {
      userId,
      timestamp: new Date().toISOString(),
      localStorageCheck: null,
      fileSystemCheck: null,
      logs: [],
      errors: [],
    };

    if (!userId || typeof userId !== "string") {
      result.errors.push("Invalid or missing userId");
      return res.status(400).json(result);
    }

    // Check file system
    const LOG_DIR = path.resolve("./data/diveLogs");
    const userFilePath = path.join(LOG_DIR, `${userId}.json`);

    try {
      await fs.access(userFilePath);
      const content = await fs.readFile(userFilePath, "utf8");
      const logs = JSON.parse(content);
      result.fileSystemCheck = `Found ${Array.isArray(logs) ? logs.length : "unknown"} logs in file system`;
      result.logs = Array.isArray(logs) ? logs : [];
    } catch (error: any) {
      result.fileSystemCheck = `No file found at ${userFilePath} - ${error?.message || "Unknown error"}`;
    }

    // Check directories
    try {
      const files = await fs.readdir(LOG_DIR);
      result.fileSystemCheck += ` | Available files: ${files.join(", ")}`;
    } catch (error: any) {
      result.errors.push(
        `Cannot read log directory: ${error?.message || "Unknown error"}`,
      );
    }

    // Additional validation checks
    const SAFE_USERID = /^[a-zA-Z0-9_-]+$/;
    if (!SAFE_USERID.test(userId)) {
      result.errors.push(`UserId "${userId}" doesn't match safe pattern`);
    }

    console.log("🔍 DEBUG RESULT:", result);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("❌ Debug endpoint error:", error);
    return res.status(500).json({
      error: error.message,
      userId: req.query.userId,
    });
  }
}
