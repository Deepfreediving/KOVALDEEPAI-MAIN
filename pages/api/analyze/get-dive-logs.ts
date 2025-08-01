import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs/promises";
import path from "path";

const LOG_DIR = path.resolve("./data/diveLogs");
const SAFE_USERID = /^[a-zA-Z0-9_-]+$/;

interface DiveLog {
  timestamp?: string | number;
  [key: string]: any;
}

interface ApiResponse {
  logs?: DiveLog[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    const { userId } = req.query;

    // ✅ Validate userId format
    if (!userId || typeof userId !== "string" || !SAFE_USERID.test(userId)) {
      res.status(400).json({ error: "Missing or invalid userId" });
      return;
    }

    const userPath = path.join(LOG_DIR, userId);

    // ✅ Check if user directory exists
    try {
      await fs.access(userPath);
    } catch {
      // If directory doesn't exist, return empty logs
      res.status(200).json({ logs: [] });
      return;
    }

    const files = await fs.readdir(userPath);
    const logs: DiveLog[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      try {
        const filePath = path.join(userPath, file);
        const content = await fs.readFile(filePath, "utf8");

        const parsed: DiveLog = JSON.parse(content);

        // ✅ Validate timestamp to prevent invalid sorting
        if (parsed && typeof parsed === "object") {
          logs.push(parsed);
        }
      } catch (parseErr) {
        console.warn(`⚠️ Could not parse file ${file}:`, parseErr);
      }
    }

    // ✅ Sort logs by timestamp (most recent first)
    logs.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0).getTime();
      const dateB = new Date(b.timestamp || 0).getTime();
      return dateB - dateA;
    });

    res.status(200).json({ logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ Failed to read dive logs:", message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
