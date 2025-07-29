import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      assistant_id: process.env.OPENAI_ASSISTANT_ID!,
    });

    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant') || {
      role: 'assistant',
      content: "✅ Log received. No detailed response available yet.",
    };

    return res.status(200).json({
      success: true,
      assistantMessage,
    });

  } catch (err) {
    console.error("❌ Error recording memory:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
