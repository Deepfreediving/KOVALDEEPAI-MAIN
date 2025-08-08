import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs/promises";
import path from "path";
import handleCors from "@/utils/handleCors"; // ✅ CHANGED from cors to handleCors

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
    // ✅ Use handleCors
    if (handleCors(req, res)) return; // Early exit for OPTIONS

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { userId } = req.query;

    // ✅ Validate userId format
    if (!userId || typeof userId !== "string" || !SAFE_USERID.test(userId)) {
      res.status(400).json({ error: "Missing or invalid userId" });
      return;
    }

    console.log(`🔍 Loading dive logs for user: ${userId}`);
    
    const allLogs: DiveLog[] = [];

    // ✅ METHOD 1: Check for direct user file (your actual logs)
    const userFilePath = path.join(LOG_DIR, `${userId}.json`);
    try {
      await fs.access(userFilePath);
      const content = await fs.readFile(userFilePath, "utf8");
      const userFileLogs = JSON.parse(content);
      if (Array.isArray(userFileLogs)) {
        allLogs.push(...userFileLogs);
        console.log(`✅ Found ${userFileLogs.length} logs in user file: ${userId}.json`);
      } else if (userFileLogs && typeof userFileLogs === 'object') {
        allLogs.push(userFileLogs);
        console.log(`✅ Found 1 log in user file: ${userId}.json`);
      }
    } catch (fileError) {
      console.log(`📁 No direct user file found: ${userId}.json`);
    }

    // ✅ METHOD 2: Check directory structure (legacy format)
    const userPath = path.join(LOG_DIR, userId);
    try {
      await fs.access(userPath);
      const files = await fs.readdir(userPath);
      
      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        try {
          const filePath = path.join(userPath, file);
          const content = await fs.readFile(filePath, "utf8");
          const parsed: DiveLog = JSON.parse(content);

          if (parsed && typeof parsed === "object") {
            allLogs.push(parsed);
          }
        } catch (parseErr) {
          console.warn(`⚠️ Could not parse file ${file}:`, parseErr);
        }
      }
      
      if (files.length > 0) {
        console.log(`✅ Found ${files.length} log files in directory: ${userId}/`);
      }
    } catch {
      console.log(`📁 No user directory found: ${userId}/`);
    }

    // ✅ METHOD 3: Check for direct UUID files and match by actual user data
    if (allLogs.length === 0) {
      console.log(`🔍 Searching for logs by content matching userId: ${userId}...`);
      try {
        const allFiles = await fs.readdir(LOG_DIR);
        const jsonFiles = allFiles.filter(f => f.endsWith('.json') && !f.includes('/'));
        
        for (const file of jsonFiles) {
          try {
            const filePath = path.join(LOG_DIR, file);
            const content = await fs.readFile(filePath, "utf8");
            const parsed: DiveLog = JSON.parse(content);
            
            // ✅ Check if this log belongs to the user by various means
            if (parsed && (
              parsed.userId === userId ||
              parsed.id?.includes(userId) ||
              // For existing logs without userId, we'll need to check patterns
              (file.includes(userId) && parsed.discipline)
            )) {
              allLogs.push({
                ...parsed,
                userId // Ensure userId is set for future queries
              });
              console.log(`✅ Found dive log: ${parsed.discipline} ${parsed.reachedDepth}m at ${parsed.location}`);
            }
          } catch (parseErr) {
            console.warn(`⚠️ Could not parse UUID file ${file}:`, parseErr);
          }
        }
        
        if (allLogs.length > 0) {
          console.log(`✅ Found ${allLogs.length} logs by content matching`);
        }
      } catch (dirError) {
        console.warn(`⚠️ Could not scan directory for UUID files:`, dirError);
      }
    }

    // ✅ METHOD 4: If still no logs, try to load from Wix UserMemory as backup
    if (allLogs.length === 0) {
      console.log(`🌐 No local logs found, checking Wix UserMemory backup...`);
      try {
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000';
          
        const response = await fetch(`https://www.deepfreediving.com/_functions/userMemory?userId=${userId}&type=dive-log`, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const wixData = await response.json();
          if (wixData.success && wixData.data) {
            // Parse dive logs from UserMemory entries
            for (const entry of wixData.data) {
              if (entry.metadata?.type === 'dive-log' && entry.logEntry) {
                try {
                  const diveLog = JSON.parse(entry.logEntry);
                  allLogs.push(diveLog);
                } catch (parseErr) {
                  console.warn('⚠️ Could not parse dive log from UserMemory:', parseErr);
                }
              }
            }
            console.log(`✅ Loaded ${allLogs.length} dive logs from Wix UserMemory backup`);
          }
        }
      } catch (wixError) {
        console.warn('⚠️ Wix UserMemory backup failed:', wixError);
      }

    }

    // ✅ Remove duplicates and sort
    const uniqueLogs = allLogs.reduce((acc: DiveLog[], log: DiveLog) => {
      const existingIndex = acc.findIndex(existing => 
        existing.id === log.id || 
        (existing.date === log.date && existing.targetDepth === log.targetDepth && existing.reachedDepth === log.reachedDepth)
      );
      
      if (existingIndex === -1) {
        acc.push(log);
      }
      return acc;
    }, []);

    // ✅ Sort logs by timestamp (most recent first)
    uniqueLogs.sort((a, b) => {
      const dateA = new Date(a.timestamp || a.date || 0).getTime();
      const dateB = new Date(b.timestamp || b.date || 0).getTime();
      return dateB - dateA;
    });

    console.log(`✅ Returning ${uniqueLogs.length} dive logs for user ${userId}`);
    res.status(200).json({ logs: uniqueLogs });
  } catch (error) {
    console.error("❌ Get dive logs error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
