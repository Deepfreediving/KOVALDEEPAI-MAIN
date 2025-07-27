import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { log, threadId, userId } = req.body;

    if (!log || !threadId || !userId) {
      return res.status(400).json({ error: 'Missing log, threadId, or userId' });
    }

    // Summarize the log for memory
    const summary = `
Dive Log Summary for User ${userId}:
- Date: ${log.date}
- Discipline: ${log.disciplineType} – ${log.discipline}
- Location: ${log.location}
- Target Depth: ${log.targetDepth}
- Reached Depth: ${log.reachedDepth}
- Mouthfill Depth: ${log.mouthfillDepth}
- Issue Depth: ${log.issueDepth}
- Issue Comment: ${log.issueComment}
- Duration/Distance: ${log.durationOrDistance}
- Total Dive Time: ${log.totalDiveTime}
- Attempt Type: ${log.attemptType}
- Exit: ${log.exit}
- Surface Protocol: ${log.surfaceProtocol}
- Squeeze: ${log.squeeze ? 'Yes' : 'No'}
- Notes: ${log.notes}
`;

    // Add to assistant memory
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: `Here is a dive log entry:\n${summary}\nPlease keep this in memory and provide a coaching response.`,
    });

    // Get assistant's immediate follow-up response
    const run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID!,
    });

    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');

    return res.status(200).json({ success: true, assistantMessage });
  } catch (err) {
    console.error("❌ Error recording memory:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
