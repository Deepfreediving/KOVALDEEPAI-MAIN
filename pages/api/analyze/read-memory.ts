// pages/api/memory/read-memory.ts
import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import axios from "axios";
import handleCors from "@/utils/cors";

const MEMORY_DIR = path.resolve("./data/memoryLogs");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (await handleCors(req, res)) return;
  // ✅ Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { userId } = req.body;

  // ✅ Validate required input
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    // 1️⃣ Load Local Memory
    let localMemory: any[] = [];
    const memoryFile = path.join(MEMORY_DIR, `${userId}.json`);
    if (fs.existsSync(memoryFile)) {
      try {
        const fileData = fs.readFileSync(memoryFile, "utf8");
        localMemory = JSON.parse(fileData);
      } catch {
        console.warn(`⚠️ Failed to parse local memory file for ${userId}, ignoring corrupted data.`);
      }
    }

    // 2️⃣ Fetch Wix Memory
    let wixMemory: any[] = [];
    try {
      const response = await axios.post("https://www.deepfreediving.com/_functions/getUserMemory", { userId });
      wixMemory = Array.isArray(response.data?.logs) ? response.data.logs : [];
    } catch (err: any) {
      console.warn("⚠️ Wix memory fetch failed:", err.message);
    }

    // 3️⃣ Merge & Deduplicate logs
    const mergedLogs = [...localMemory, ...wixMemory];
    const seen = new Set<string>();
    const finalMemory = mergedLogs.filter((log: any) => {
      if (!log.id) {
        log.id = `${log.timestamp || Date.now()}-${Math.random()}`;
      }
      if (seen.has(log.id)) return false;
      seen.add(log.id);
      return true;
    });

    // 4️⃣ Sort by timestamp
    const sortedMemory = finalMemory.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeA - timeB;
    });

    return res.status(200).json({
      userId,
      total: sortedMemory.length,
      memory: sortedMemory,
    });

  } catch (err: any) {
    console.error("❌ read-memory error:", err.message);
    return res.status(500).json({ error: "Failed to read memory logs" });
  }
}
