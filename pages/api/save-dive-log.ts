import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const LOG_DIR = path.resolve('./data/diveLogs');

// Ensure log directory exists on startup
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      userId = '',
      date = '',
      disciplineType = '',
      discipline = '',
      location = '',
      targetDepth = '',
      reachedDepth = '',
      mouthfillDepth = '',
      issueDepth = '',
      squeeze = false,
      exit = '',
      durationOrDistance = '',
      attemptType = '',
      notes = '',
      totalDiveTime = '',
      issueComment = '',
      surfaceProtocol = '',
    } = req.body || {};

    if (!userId || !date || !discipline) {
      return res.status(400).json({ error: 'Missing required fields: userId, date, or discipline' });
    }

    const safeUserId = path.basename(userId);
    const id = uuidv4();

    const logEntry = {
      id,
      userId: safeUserId,
      date: new Date(date).toISOString(),
      disciplineType,
      discipline,
      location,
      targetDepth: parseFloat(targetDepth) || 0,
      reachedDepth: parseFloat(reachedDepth) || 0,
      mouthfillDepth: parseFloat(mouthfillDepth) || 0,
      issueDepth: parseFloat(issueDepth) || 0,
      squeeze: !!squeeze,
      exit,
      durationOrDistance,
      attemptType,
      notes,
      totalDiveTime,
      issueComment,
      surfaceProtocol,
      timestamp: new Date().toISOString(),
      source: 'save-dive-log.ts',
    };

    // ✅ 1. Save locally
    const userLogDir = path.join(LOG_DIR, safeUserId);
    if (!fs.existsSync(userLogDir)) {
      fs.mkdirSync(userLogDir, { recursive: true });
    }

    const filePath = path.join(userLogDir, `${id}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(logEntry, null, 2));

    // ✅ 2. Mirror to Wix (async, don't block response)
    axios.post(
      'https://www.deepfreediving.com/_functions/saveDiveLog',
      { ...logEntry, userId: safeUserId },
      { headers: { 'Content-Type': 'application/json' } }
    ).catch(err => {
      console.error(`⚠️ Failed to sync dive log ${id} to Wix:`, err.response?.data || err.message);
    });

    console.log(`✅ Dive log saved locally and syncing to Wix for user: ${safeUserId}, ID: ${id}`);
    return res.status(200).json({ success: true, id, saved: true });

  } catch (err: any) {
    console.error('❌ Error saving dive log:', err.message || err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
