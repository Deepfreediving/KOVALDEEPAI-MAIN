import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assistantId = process.env.OPENAI_ASSISTANT_ID;
const MEMORY_DIR = path.resolve('./data/memoryLogs');

// Ensure memory directory exists
if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

const safe = (v: any) => (v !== undefined && v !== null && v !== "") ? v : 'N/A';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { log, threadId, userId } = req.body;

    if (!log || !threadId || !userId) {
      return res.status(400).json({ error: 'Missing log, threadId, or userId' });
    }

    const summary = `
Dive Log Summary for User ${userId}:
- Date: ${safe(log.date)}
- Discipline: ${safe(log.disciplineType)} – ${safe(log.discipline)}
- Location: ${safe(log.location)}
- Target Depth: ${safe(log.targetDepth)}
- Reached Depth: ${safe(log.reachedDepth)}
- Mouthfill Depth: ${safe(log.mouthfillDepth)}
- Issue Depth: ${safe(log.issueDepth)}
- Issue Comment: ${safe(log.issueComment)}
- Duration/Distance: ${safe(log.durationOrDistance)}
- Total Dive Time: ${safe(log.totalDiveTime)}
- Attempt Type: ${safe(log.attemptType)}
- Exit: ${safe(log.exit)}
- Surface Protocol: ${safe(log.surfaceProtocol)}
- Squeeze: ${log.squeeze ? 'Yes' : 'No'}
- Notes: ${safe(log.notes)}
`;

    // ✅ 1. Save to local memory
    const userMemoryFile = path.join(MEMORY_DIR, `${userId}.json`);
    let userMemory = [];
    if (fs.existsSync(userMemoryFile)) {
      try {
        userMemory = JSON.parse(fs.readFileSync(userMemoryFile, 'utf8'));
      } catch (e) {
        console.warn(`⚠️ Failed to parse memory for user ${userId}, resetting file.`);
        userMemory = [];
      }
    }
    userMemory.push({ ...log, threadId, timestamp: new Date().toISOString() });
    fs.writeFileSync(userMemoryFile, JSON.stringify(userMemory, null, 2));

    // ✅ 2. Send to OpenAI Memory
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: `Here is a dive log entry:\n${summary}\nPlease keep this in memory and provide a coaching response.`,
      metadata: {
        type: 'diveLog',
        userId,
        createdFrom: 'record-memory.ts'
      },
    });

    const run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistantId!,
    });

    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant') || {
      role: 'assistant',
      content: "✅ Log received. No detailed response available yet.",
    };

    // ✅ 3. Mirror to Wix CMS
    fetch('https://www.deepfreediving.com/_functions/saveToUserMemory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...log,
        userId,
        threadId
      }),
    }).catch(err => {
      console.error("⚠️ Failed to sync memory to Wix:", err.message || err);
    });

    return res.status(200).json({
      success: true,
      assistantMessage,
    });

  } catch (err: any) {
    console.error("❌ Error recording memory:", err?.message || err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
