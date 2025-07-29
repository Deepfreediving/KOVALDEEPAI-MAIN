import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve('./data/diveLogs');

interface DiveLog {
  [key: string]: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'Missing or invalid userId' });
    return;
  }

  const userPath = path.join(LOG_DIR, userId);

  if (!fs.existsSync(userPath)) {
    res.status(200).json({ logs: [] }); // No logs yet
    return;
  }

  try {
    const files = fs.readdirSync(userPath);
    const logs: DiveLog[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(userPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const parsed: DiveLog = JSON.parse(content);
          logs.push(parsed);
        } catch (parseErr) {
          console.warn(`⚠️ Could not parse file ${file}:`, parseErr);
        }
      }
    }

    // ✅ Optional: Sort logs by timestamp (most recent first)
    logs.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0).getTime();
      const dateB = new Date(b.timestamp || 0).getTime();
      return dateB - dateA;
    });

    res.status(200).json({ logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Failed to read dive logs:', message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
