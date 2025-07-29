import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { userId, sessionName, profile, eqState, messages, timestamp } = req.body;

  if (!userId || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Missing or invalid userId/messages." });
  }

  const WIX_BASE_URL = process.env.WIX_BASE_URL || "https://www.deepfreediving.com/_functions";
  const endpoint = `${WIX_BASE_URL}/saveToUserMemory`;

  try {
    const pairedMessages = [];
    const sessionId = `${userId}-${Date.now()}`; // unique session ID

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (msg.role === "user") {
        const nextMsg = messages[i + 1];
        const assistantReply =
          nextMsg && nextMsg.role === "assistant" ? nextMsg.content : "⚠️ No assistant response";

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
            sessionName: sessionName || `Manual – ${new Date().toLocaleString()}`,
          },
        });
      }
    }

    const results = [];
    for (const log of pairedMessages) {
      try {
        await axios.post(endpoint, log, {
          headers: { "Content-Type": "application/json" },
        });
        results.push({ logEntry: log.logEntry, status: "saved" });
      } catch (uploadErr: any) {
        console.error(`⚠️ Failed to save log:`, uploadErr.response?.data || uploadErr.message);
        results.push({ logEntry: log.logEntry, status: "failed" });
      }
    }

    return res.status(200).json({ success: true, saved: results });
  } catch (err: any) {
    console.error("❌ Save session error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to save session to Wix." });
  }
}
