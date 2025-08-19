import { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import fs from "fs";
import path from "path";
import {
  analyzeDiveLogText,
  generateDiveReport,
} from "../../../utils/analyzeDiveLog";
import handleCors from "@/utils/handleCors"; // ✅ CHANGED from cors to handleCors

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const assistantId = process.env.OPENAI_ASSISTANT_ID;
const MEMORY_DIR = path.resolve("./data/memoryLogs");

// Ensure memory directory exists
if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

const safe = (v: any) =>
  v !== undefined && v !== null && v !== "" ? v : "N/A";

interface DiveLog {
  date?: string;
  disciplineType?: string;
  discipline?: string;
  location?: string;
  targetDepth?: number;
  reachedDepth?: number;
  mouthfillDepth?: number;
  issueDepth?: number;
  issueComment?: string;
  durationOrDistance?: string;
  totalDiveTime?: string;
  attemptType?: string;
  exit?: string;
  surfaceProtocol?: string;
  squeeze?: boolean;
  notes?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // ✅ Use handleCors
    if (await handleCors(req, res)) return; // Early exit for OPTIONS

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { log, threadId, userId } = req.body as {
      log: DiveLog;
      threadId?: string; // Make threadId optional
      userId: string;
    };

    // Validate input
    if (!log || !userId) {
      return res.status(400).json({
        error: "Missing required fields: log or userId",
      });
    }

    // Use provided threadId if valid, otherwise create a new OpenAI thread when needed
    let finalThreadId = threadId;

    // If we have an assistant and no valid thread ID, create one
    if (
      assistantId &&
      (!finalThreadId || !finalThreadId.startsWith("thread_"))
    ) {
      try {
        const thread = await openai.beta.threads.create();
        finalThreadId = thread.id;
        console.log(`✅ Created new OpenAI thread: ${finalThreadId}`);
      } catch (error) {
        console.warn(
          "⚠️ Failed to create OpenAI thread, will skip OpenAI integration",
        );
        finalThreadId = `local-${userId}-${Date.now()}`;
      }
    } else if (!finalThreadId) {
      // Fallback for local storage only
      finalThreadId = `local-${userId}-${Date.now()}`;
    }

    // ✅ 1. Generate a human-readable dive log summary
    const summary = `
Dive Log Summary for User ${userId}:
- Date: ${safe(log.date)}
- Discipline: ${safe(log.disciplineType)} – ${safe(log.discipline)}
- Location: ${safe(log.location)}
- Target Depth: ${safe(log.targetDepth)} m
- Reached Depth: ${safe(log.reachedDepth)} m
- Mouthfill Depth: ${safe(log.mouthfillDepth)} m
- Issue Depth: ${safe(log.issueDepth)} m
- Issue Comment: ${safe(log.issueComment)}
- Duration/Distance: ${safe(log.durationOrDistance)}
- Total Dive Time: ${safe(log.totalDiveTime)}
- Attempt Type: ${safe(log.attemptType)}
- Exit: ${safe(log.exit)}
- Surface Protocol: ${safe(log.surfaceProtocol)}
- Squeeze: ${log.squeeze ? "Yes" : "No"}
- Notes: ${safe(log.notes)}
`;

    // ✅ 2. Analyze log and generate coaching feedback
    const textLog = `
Reached Depth: ${log.reachedDepth}m
Target Depth: ${log.targetDepth}m
Mouthfill Depth: ${log.mouthfillDepth}m
Issue Depth: ${log.issueDepth}m
Notes: ${log.notes}
`;
    const analysis = analyzeDiveLogText(textLog);
    const coachingReport = generateDiveReport(analysis);

    // ✅ 3. Save user memory to a local JSON file
    const userMemoryFile = path.join(MEMORY_DIR, `${userId}.json`);
    let userMemory: any[] = [];

    try {
      if (fs.existsSync(userMemoryFile)) {
        const fileData = fs.readFileSync(userMemoryFile, "utf8");
        userMemory = JSON.parse(fileData || "[]");
      }
    } catch (e) {
      console.warn(
        `⚠️ Failed to read memory for user ${userId}, starting fresh.`,
        e,
      );
    }

    userMemory.push({
      ...log,
      threadId: finalThreadId,
      coachingReport,
      timestamp: new Date().toISOString(),
    });

    try {
      fs.writeFileSync(userMemoryFile, JSON.stringify(userMemory, null, 2));
    } catch (e) {
      console.error("❌ Failed to write memory file:", e);
    }

    // ✅ 4. Send data to OpenAI Memory API (only if we have assistant ID)
    let assistantMessage = {
      role: "assistant",
      content: "✅ Log received and coaching report saved.",
    };

    if (assistantId && finalThreadId?.startsWith("thread_")) {
      try {
        await openai.beta.threads.messages.create(finalThreadId, {
          role: "user",
          content: `Here is a dive log entry:\n${summary}\n\nCoaching Analysis:\n${coachingReport}\n\nPlease store this for future coaching sessions.`,
          metadata: {
            type: "diveLog",
            userId,
            createdFrom: "record-memory.ts",
          },
        });

        await openai.beta.threads.runs.createAndPoll(finalThreadId, {
          assistant_id: assistantId!,
        });

        const messages = await openai.beta.threads.messages.list(finalThreadId);
        const latestAssistantMessage = messages.data.find(
          (msg) => msg.role === "assistant",
        );
        if (
          latestAssistantMessage &&
          latestAssistantMessage.content?.[0]?.type === "text"
        ) {
          assistantMessage = {
            role: "assistant",
            content: latestAssistantMessage.content[0].text.value,
          };
        }
      } catch (openaiError) {
        console.warn(
          "⚠️ OpenAI thread operations failed (but memory saved locally):",
          openaiError,
        );
      }
    } else {
      console.warn(
        "⚠️ No OpenAI Assistant ID configured, skipping thread operations",
      );
    }

    // ✅ 5. Mirror memory to Wix CMS (non-blocking)
    fetch("https://www.deepfreediving.com/_functions/saveToUserMemory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...log,
        coachingReport,
        userId,
        threadId: finalThreadId,
      }),
    }).catch((err) => {
      console.error("⚠️ Failed to sync memory to Wix:", err.message || err);
    });

    return res.status(200).json({
      success: true,
      assistantMessage,
      coachingReport,
    });
  } catch (err: any) {
    console.error("❌ Error recording memory:", err?.message || err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
