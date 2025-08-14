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

    const WIX_BASE_URL =
      process.env.WIX_BASE_URL || "https://www.deepfreediving.com/_functions";
    const endpoint = `${WIX_BASE_URL}/saveToUserMemory`;

    const sessionId = `${userId}-${Date.now()}`;
    const results: { logEntry: string; status: string }[] = [];
    const pairedMessages: MemoryLog[] = [];

    // ✅ Pair each user message with the next assistant message
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

    // ✅ Upload each paired message to Wix memory
    for (const log of pairedMessages) {
      if (!log?.logEntry) continue; // Avoid null logs

      try {
        await axios.post(endpoint, log, {
          headers: { "Content-Type": "application/json" },
        });
        results.push({ logEntry: log.logEntry, status: "saved" });
      } catch (uploadErr: any) {
        console.error(
          `⚠️ Failed to save log:`,
          uploadErr.response?.data || uploadErr.message,
        );
        results.push({ logEntry: log.logEntry, status: "failed" });
      }
    }

    return res.status(200).json({ success: true, saved: results });
  } catch (error) {
    console.error("❌ Save session error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
