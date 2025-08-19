// pages/api/analyze/save-session.ts

import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from '@supabase/supabase-js';
import handleCors from "@/utils/handleCors";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SessionData {
  user_id: string;
  session_name: string;
  messages: ChatMessage[];
  timestamp: string;
  metadata: {
    intent_label: string;
    session_type: string;
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

    // ✅ Verify authentication with Supabase JWT
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.substring(7);
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: "Missing Supabase configuration" });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: "Invalid authentication token" });
    }

    const { sessionName, profile, eqState, messages, timestamp } = req.body;

    // ✅ Validate inputs
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing or invalid messages array." });
    }

    // ✅ Session saving to Supabase user_memory table
    console.log("📋 Session save request - using Supabase storage for user:", user.id);
    
    const sessionId = `${user.id}-${Date.now()}`;
    const results: { logEntry: string; status: string }[] = [];

    // ✅ Process messages and save to user_memory
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i] as ChatMessage;

      if (msg.role === "user" && msg.content?.trim()) {
        const nextMsg = messages[i + 1] as ChatMessage | undefined;
        const assistantReply =
          nextMsg?.role === "assistant" && nextMsg.content?.trim()
            ? nextMsg.content
            : "⚠️ No assistant response recorded";

        // Save each user-assistant pair to user_memory
        const memoryEntry = {
          user_id: user.id,
          memory_type: 'session' as const,
          content: {
            user_message: msg.content,
            assistant_reply: assistantReply,
            session_id: sessionId,
            session_name: sessionName || `Manual – ${new Date().toLocaleString()}`,
            timestamp: timestamp || new Date().toISOString(),
            metadata: {
              intent_label: "manual-save",
              session_type: "manual",
              eq_state: eqState,
              profile,
            }
          }
        };

        try {
          const { error: insertError } = await supabase
            .from('user_memory')
            .insert(memoryEntry);

          if (insertError) {
            console.error('Failed to save memory entry:', insertError);
            results.push({ logEntry: msg.content, status: "error" });
          } else {
            console.log(`📝 Saved message: ${msg.content.substring(0, 50)}...`);
            results.push({ logEntry: msg.content, status: "saved" });
          }
        } catch (error) {
          console.error('Error saving memory entry:', error);
          results.push({ logEntry: msg.content, status: "error" });
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      saved: results,
      user_id: user.id,
      session_id: sessionId
    });
  } catch (error) {
    console.error("❌ Save session error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
