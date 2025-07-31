// pages/api/sync-dive-logs.ts

import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

interface DiveLog {
  id: string;
  [key: string]: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { userId, localLogs = [] }: { userId: string; localLogs: DiveLog[] } = req.body;

    // ✅ Validate inputs
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "Missing or invalid userId" });
    }

    if (!Array.isArray(localLogs)) {
      return res.status(400).json({ error: "Invalid localLogs array" });
    }

    const WIX_BASE_URL = process.env.WIX_BASE_URL || "https://www.deepfreediving.com/_functions";

    // 1️⃣ Fetch logs from Wix
    const wixResponse = await axios.post(`${WIX_BASE_URL}/getDiveLogs`, { userId });
    const wixLogs: DiveLog[] = Array.isArray(wixResponse.data?.logs) ? wixResponse.data.logs : [];

    // 2️⃣ Create a set of Wix log IDs for quick lookup
    const wixIds = new Set(wixLogs.map((log) => log.id));

    // 3️⃣ Identify logs missing in Wix
    const newLogs = localLogs.filter((log) => log && log.id && !wixIds.has(log.id));

    // 4️⃣ Upload missing logs to Wix
    for (const log of newLogs) {
      try {
        await axios.post(`${WIX_BASE_URL}/saveDiveLog`, { ...log, userId }, {
          headers: { "Content-Type": "application/json" },
        });
        console.log(`✅ Uploaded missing log to Wix: ${log.id}`);
      } catch (uploadErr: any) {
        console.warn(`⚠️ Failed to upload log ${log.id}:`, uploadErr.response?.data || uploadErr.message);
      }
    }

    // 5️⃣ Merge all logs uniquely by ID
    const mergedMap = new Map<string, DiveLog>();
    [...wixLogs, ...newLogs].forEach((log) => {
      if (log?.id) mergedMap.set(log.id, log);
    });

    const mergedLogs = Array.from(mergedMap.values());

    return res.status(200).json({
      success: true,
      logs: mergedLogs,
      uploadedCount: newLogs.length,
    });

  } catch (err: any) {
    console.error("❌ Dive log sync error:", err.response?.data || err.message || err);
    return res.status(500).json({ error: "Failed to sync logs" });
  }
}
