import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import axios from "axios";

const MEMORY_DIR = path.resolve("./data/memoryLogs");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    // 1️⃣ Load Local Memory
    let localMemory = [];
    const memoryFile = path.join(MEMORY_DIR, `${userId}.json`);
    if (fs.existsSync(memoryFile)) {
      try {
        localMemory = JSON.parse(fs.readFileSync(memoryFile, "utf8"));
      } catch {
        console.warn(`⚠️ Failed to parse local memory for ${userId}`);
      }
    }

    // 2️⃣ Fetch Wix Memory
    let wixMemory = [];
    try {
      const response = await axios.post("https://www.deepfreediving.com/_functions/getUserMemory", { userId });
      wixMemory = Array.isArray(response.data?.logs) ? response.data.logs : [];
    } catch (err: any) {
      console.warn("⚠️ Wix memory fetch failed:", err.message);
    }

    // 3️⃣ Merge & Deduplicate
    const merged = [...localMemory, ...wixMemory];
    const seen = new Set();
    const finalMemory = merged.filter((log: any) => {
      if (!log.id) log.id = `${log.timestamp}-${Math.random()}`;
      if (seen.has(log.id)) return false;
      seen.add(log.id);
      return true;
    });

    return res.status(200).json({
      userId,
      total: finalMemory.length,
      memory: finalMemory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    });
  } catch (err: any) {
    console.error("❌ read-memory error:", err.message);
    return res.status(500).json({ error: "Failed to read memory" });
  }
}
