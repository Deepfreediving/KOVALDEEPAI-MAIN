import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve('./data/diveLogs');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid userId' });
  }

  const userPath = path.join(LOG_DIR, userId);
  if (!fs.existsSync(userPath)) {
    return res.status(200).json({ logs: [] }); // No logs yet
  }

  try {
    const files = fs.readdirSync(userPath);
    const logs = files
      .filter((f) => f.endsWith('.json'))
      .map((file) => {
        const filePath = path.join(userPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      });

    res.status(200).json({ logs });
  } catch (err) {
    console.error('❌ Failed to read dive logs:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
