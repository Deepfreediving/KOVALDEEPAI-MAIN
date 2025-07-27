import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Store dive logs in local filesystem for now
const LOG_DIR = path.resolve('./data/diveLogs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const {
      date,
      disciplineType,
      discipline,
      location,
      targetDepth,
      reachedDepth,
      mouthfillDepth,
      issueDepth,
      squeeze,
      exit,
      durationOrDistance,
      attemptType,
      notes,
      totalDiveTime,         // 🆕 mm:ss
      issueComment,          // 🆕 optional
      surfaceProtocol,       // 🆕 final exit steps
    } = req.body;

    if (!date || !discipline) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    const logData = {
      id,
      date,
      disciplineType,
      discipline,
      location,
      targetDepth,
      reachedDepth,
      mouthfillDepth,
      issueDepth,
      squeeze,
      exit,
      durationOrDistance,
      attemptType,
      notes,
      totalDiveTime,
      issueComment,
      surfaceProtocol,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(path.join(LOG_DIR, `${id}.json`), JSON.stringify(logData, null, 2));
    res.status(200).json({ success: true, id });
  } catch (err) {
    console.error('❌ Error saving dive log:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
