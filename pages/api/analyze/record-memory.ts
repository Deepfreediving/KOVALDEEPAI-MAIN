import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { analyzeDiveLogText, generateDiveReport } from '../../../utils/analyzeDiveLog';
import handleCors from "@/utils/cors";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const assistantId = process.env.OPENAI_ASSISTANT_ID;
const MEMORY_DIR = path.resolve('./data/memoryLogs');

// Ensure memory directory exists
if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

const safe = (v: any) => (v !== undefined && v !== null && v !== '') ? v : 'N/A';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (await handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { log, threadId, userId } = req.body as {
      log: DiveLog;
      threadId: string;
      userId: string;
    };

    // Validate input
    if (!log || !threadId || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: log, threadId, or userId',
      });
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
- Squeeze: ${log.squeeze ? 'Yes' : 'No'}
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
        const fileData = fs.readFileSync(userMemoryFile, 'utf8');
        userMemory = JSON.parse(fileData || '[]');
      }
    } catch (e) {
      console.warn(`⚠️ Failed to read memory for user ${userId}, starting fresh.`, e);
    }

    userMemory.push({
      ...log,
      threadId,
      coachingReport,
      timestamp: new Date().toISOString(),
    });

    try {
      fs.writeFileSync(userMemoryFile, JSON.stringify(userMemory, null, 2));
    } catch (e) {
      console.error('❌ Failed to write memory file:', e);
    }

    // ✅ 4. Send data to OpenAI Memory API
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: `Here is a dive log entry:\n${summary}\n\nCoaching Analysis:\n${coachingReport}\n\nPlease store this for future coaching sessions.`,
      metadata: {
        type: 'diveLog',
        userId,
        createdFrom: 'record-memory.ts',
      },
    });

    await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistantId!,
    });

    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessage =
      messages.data.find((msg) => msg.role === 'assistant') || {
        role: 'assistant',
        content: '✅ Log received and coaching report saved.',
      };

    // ✅ 5. Mirror memory to Wix CMS (non-blocking)
    fetch('https://www.deepfreediving.com/_functions/saveToUserMemory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...log,
        coachingReport,
        userId,
        threadId,
      }),
    }).catch((err) => {
      console.error('⚠️ Failed to sync memory to Wix:', err.message || err);
    });

    return res.status(200).json({
      success: true,
      assistantMessage,
      coachingReport,
    });
  } catch (err: any) {
    console.error('❌ Error recording memory:', err?.message || err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
