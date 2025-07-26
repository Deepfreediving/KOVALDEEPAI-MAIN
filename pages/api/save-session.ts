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

  try {
    const pairedMessages = [];

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
          metadata: {
            intentLabel: "manual-save",
            sessionType: "manual",
            sessionName: sessionName || `Manual – ${new Date().toLocaleString()}`,
          },
        });
      }
    }

    const endpoint = "https://www.deepfreediving.com/_functions/saveToUserMemory";

    for (const log of pairedMessages) {
      await axios.post(endpoint, log, {
        headers: { "Content-Type": "application/json" },
      });
    }

    return res.status(200).json({ success: true, saved: pairedMessages.length });
  } catch (err: any) {
    console.error("❌ Save session error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to save session to Wix." });
  }
}
