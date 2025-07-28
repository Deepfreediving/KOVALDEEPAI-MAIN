import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// === Local directory to save dive logs ===
const LOG_DIR = path.resolve('./data/diveLogs');

// Ensure the directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      userId,
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
      totalDiveTime,        // e.g., '02:30'
      issueComment,         // optional
      surfaceProtocol,      // optional
    } = req.body;

    // === Validation ===
    if (!userId || !date || !discipline) {
      return res.status(400).json({ error: 'Missing required fields: userId, date, or discipline' });
    }

    const id = uuidv4();

    const logEntry = {
      id,
      userId,
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

    // Save log as JSON file
    const userLogDir = path.join(LOG_DIR, userId);
    if (!fs.existsSync(userLogDir)) {
      fs.mkdirSync(userLogDir, { recursive: true });
    }

    const filePath = path.join(userLogDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(logEntry, null, 2));

    return res.status(200).json({ success: true, id, saved: true });
  } catch (err) {
    console.error('❌ Error saving dive log:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
