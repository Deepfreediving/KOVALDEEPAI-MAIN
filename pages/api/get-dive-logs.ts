import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve('./data/diveLogs');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
    const logs = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(userPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const parsed = JSON.parse(content);
          logs.push(parsed);
        } catch (parseErr) {
          console.warn(`⚠️ Could not parse file ${file}:`, parseErr);
        }
      }
    }

    res.status(200).json({ logs });
  } catch (err: any) {
    console.error('❌ Failed to read dive logs:', err.message || err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
