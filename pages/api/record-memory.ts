import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assistantId = process.env.OPENAI_ASSISTANT_ID;

const safe = (v: any) => (v !== undefined && v !== null && v !== "") ? v : 'N/A';

// Helper to timeout a promise
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("OpenAI response timed out."));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timeout);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { log, threadId, userId } = req.body;

    if (!log || !threadId || !userId) {
      return res.status(400).json({ error: 'Missing log, threadId, or userId' });
    }

    // -----------------------------
    // 1️⃣ Build Dive Log Summary
    // -----------------------------
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

    // -----------------------------
    // 2️⃣ Save to OpenAI Memory
    // -----------------------------
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: `Here is a dive log entry:\n${summary}\nPlease keep this in memory and provide a coaching response.`,
      metadata: {
        type: 'diveLog',
        userId,
        createdFrom: 'record-memory.ts'
      },
    });

    const run = await withTimeout(
      openai.beta.threads.runs.createAndPoll(threadId, {
        assistant_id: assistantId!,
      }),
      20000 // 20 second timeout
    );

    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant') || {
      role: 'assistant',
      content: "✅ Log received. No detailed response available yet.",
    };

    // -----------------------------
    // 3️⃣ Save to Wix CMS (User Memory)
    // -----------------------------
    try {
      const wixResp = await fetch('https://www.deepfreediving.com/_functions/saveToUserMemory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          Date: log.date || new Date().toISOString(),
          disciplineType: log.disciplineType || '',
          discipline: log.discipline || '',
          location: log.location || '',
          targetDepth: log.targetDepth || '',
          reachedDepth: log.reachedDepth || '',
          mouthfillDepth: log.mouthfillDepth || '',
          issueDepth: log.issueDepth || '',
          issueComment: log.issueComment || '',
          durationOrDistance: log.durationOrDistance || '',
          totalDiveTime: log.totalDiveTime || '',
          attemptType: log.attemptType || '',
          exit: log.exit || '',
          surfaceProtocol: log.surfaceProtocol || '',
          squeeze: log.squeeze ? 'Yes' : 'No',
          notes: log.notes || '',
          threadId
        }),
      });

      const wixData = await wixResp.json();
      console.log("✅ Wix save response:", wixData);
    } catch (wixErr: any) {
      console.error("❌ Failed to save to Wix User Memory:", wixErr.message || wixErr);
    }

    // -----------------------------
    // 4️⃣ Send API Response
    // -----------------------------
    return res.status(200).json({
      success: true,
      assistantMessage,
    });

  } catch (err: any) {
    console.error("❌ Error recording memory:", err?.message || err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
