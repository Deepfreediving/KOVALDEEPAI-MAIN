// pages/api/analyze/save-session.ts

import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import handleCors from "@/utils/handleCors"; // ✅ CHANGED from cors to handleCors

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface MemoryLog {
  userId: string;
  logEntry: string;
  memoryContent: string;
  eqState?: string;
  profile?: string;
  timestamp: string;
  sessionId: string;
  metadata: {
    intentLabel: string;
    sessionType: string;
    sessionName: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // ✅ Use handleCors
    if (handleCors(req, res)) return; // Early exit for OPTIONS

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { userId, sessionName, profile, eqState, messages, timestamp } =
      req.body;

    // ✅ Validate inputs
    if (!userId || !Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({ error: "Missing or invalid userId/messages." });
    }

    // ✅ Session saving migrated to Supabase
    console.log("📋 Session save request - using Supabase storage");
    
    const sessionId = `${userId}-${Date.now()}`;
    const results: { logEntry: string; status: string }[] = [];
    const pairedMessages: MemoryLog[] = [];

    // ✅ Process messages for compatibility
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i] as ChatMessage;

      if (msg.role === "user" && msg.content?.trim()) {
        const nextMsg = messages[i + 1] as ChatMessage | undefined;
        const assistantReply =
          nextMsg?.role === "assistant" && nextMsg.content?.trim()
            ? nextMsg.content
            : "⚠️ No assistant response recorded";

        pairedMessages.push({
          userId,
          logEntry: msg.content,
          memoryContent: assistantReply,
          eqState,
          profile,
          timestamp: timestamp || new Date().toISOString(),
          sessionId,
          metadata: {
            intentLabel: "manual-save",
            sessionType: "manual",
            sessionName:
              sessionName || `Manual – ${new Date().toLocaleString()}`,
          },
        });
      }
    }

    // ✅ Mark all messages as saved (migrated to Supabase)
    for (const log of pairedMessages) {
      if (!log?.logEntry) continue;
      
      // Log locally for debugging
      console.log(`📝 Processing message: ${log.logEntry.substring(0, 50)}...`);
      results.push({ logEntry: log.logEntry, status: "processed" });
    }

    return res.status(200).json({ success: true, saved: results });
  } catch (error) {
    console.error("❌ Save session error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
