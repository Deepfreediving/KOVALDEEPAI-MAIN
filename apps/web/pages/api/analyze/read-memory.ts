// pages/api/analyze/read-memory.ts
import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import axios from "axios";
import handleCors from "@/utils/handleCors"; // ✅ CHANGED from cors to handleCors

const MEMORY_DIR = path.resolve("./data/memoryLogs");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // ✅ Use handleCors
    if (handleCors(req, res)) return; // Early exit for OPTIONS

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
      // 1️⃣ Load Local Memory (existing system)
      let localMemory: any[] = [];
      const memoryFile = path.join(MEMORY_DIR, `${userId}.json`);
      if (fs.existsSync(memoryFile)) {
        try {
          const fileData = fs.readFileSync(memoryFile, "utf8");
          localMemory = JSON.parse(fileData);
        } catch {
          console.warn(
            `⚠️ Failed to parse local memory file for ${userId}, ignoring corrupted data.`,
          );
        }
      }

      // 1.5️⃣ Load Dive Logs Directory (NEW - for comprehensive data)
      const diveLogsMemory: any[] = [];
      const diveLogsDir = path.resolve("./data/diveLogs", userId);
      if (fs.existsSync(diveLogsDir)) {
        try {
          const diveLogFiles = fs
            .readdirSync(diveLogsDir)
            .filter((file) => file.endsWith(".json"));
          for (const file of diveLogFiles) {
            const filePath = path.join(diveLogsDir, file);
            const diveLogData = JSON.parse(fs.readFileSync(filePath, "utf8"));
            // Convert dive log format to memory format
            diveLogsMemory.push({
              id: diveLogData.id,
              timestamp: diveLogData.timestamp,
              type: "dive-log",
              source: "dive-logs-directory",
              ...diveLogData,
            });
          }
          console.log(
            `📊 Loaded ${diveLogsMemory.length} dive logs from directory for user ${userId}`,
          );
        } catch (error) {
          console.warn(
            `⚠️ Failed to load dive logs directory for ${userId}:`,
            error,
          );
        }
      }

      // 2️⃣ Load from Supabase user_memory and dive_logs tables
      console.log("📋 Loading comprehensive memory from Supabase...");

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      let supabaseMemory: any[] = [];

      if (supabaseUrl && supabaseKey) {
        try {
          const { createClient } = require("@supabase/supabase-js");
          const supabase = createClient(supabaseUrl, supabaseKey);

          // Load user memory
          const { data: memoryData, error: memoryError } = await supabase
            .from("user_memory")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(100);

          if (memoryError) {
            console.warn("⚠️ Error loading user memory:", memoryError);
          } else if (memoryData) {
            supabaseMemory = memoryData.map((record: any) => ({
              id: record.id,
              timestamp: record.created_at,
              type: record.memory_type,
              source: "supabase-user-memory",
              content: record.content,
              ...record,
            }));
            console.log(
              `📊 Loaded ${supabaseMemory.length} memory entries from Supabase`,
            );
          }

          // Load dive logs with image analysis
          const { data: diveLogs, error: diveError } = await supabase
            .from("dive_logs")
            .select(`
              *,
              dive_log_image (
                extracted_metrics,
                ai_analysis,
                original_filename
              )
            `)
            .eq("user_id", userId)
            .order("date", { ascending: false })
            .limit(50);

          if (diveError) {
            console.warn("⚠️ Error loading dive logs:", diveError);
          } else if (diveLogs) {
            const diveMemory = diveLogs.map((log: any) => ({
              id: `dive-${log.id}`,
              timestamp: log.created_at || log.date,
              type: "dive-log",
              source: "supabase-dive-logs",
              content: {
                dive_data: log,
                image_analysis: log.dive_log_image,
                coaching_ready: !!(
                  log.ai_analysis || log.dive_log_image?.ai_analysis
                ),
              },
              ...log,
            }));
            supabaseMemory = [...supabaseMemory, ...diveMemory];
            console.log(`📊 Loaded ${diveLogs.length} dive logs from Supabase`);
          }
        } catch (supabaseError) {
          console.warn("⚠️ Supabase memory loading failed:", supabaseError);
        }
      }

      // 3️⃣ Merge & Deduplicate logs (all sources)
      const mergedLogs = [...localMemory, ...diveLogsMemory, ...supabaseMemory];
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
  } catch (error) {
    console.error("❌ Read memory error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
