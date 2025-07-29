import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve('./data/diveLogs');

// Ensure log directory exists on startup
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Safely extract values from request
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

    // ✅ If no log data was provided, skip saving
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('ℹ️ No dive log provided, skipping save.');
      return res.status(200).json({ success: false, message: 'No dive log provided.' });
    }

    // ✅ Basic validation for required fields
    if (!userId || !date || !discipline) {
      console.warn('⚠️ Missing required fields for dive log:', { userId, date, discipline });
      return res.status(400).json({ error: 'Missing required fields: userId, date, or discipline' });
    }

    // Generate unique log ID
    const id = uuidv4();

    // Construct log entry
    const logEntry = {
      id,
      userId,
      date,
      disciplineType,
      discipline,
      location,
      targetDepth: isNaN(parseFloat(targetDepth)) ? 0 : parseFloat(targetDepth),
      reachedDepth: isNaN(parseFloat(reachedDepth)) ? 0 : parseFloat(reachedDepth),
      mouthfillDepth: isNaN(parseFloat(mouthfillDepth)) ? 0 : parseFloat(mouthfillDepth),
      issueDepth: isNaN(parseFloat(issueDepth)) ? 0 : parseFloat(issueDepth),
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

    // ✅ Create user directory if missing
    const userLogDir = path.join(LOG_DIR, userId);
    if (!fs.existsSync(userLogDir)) {
      fs.mkdirSync(userLogDir, { recursive: true });
    }

    // Write log file
    const filePath = path.join(userLogDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(logEntry, null, 2));

    console.log(`✅ Dive log saved for user: ${userId}, ID: ${id}`);
    return res.status(200).json({ success: true, id, saved: true });

  } catch (err: any) {
    console.error('❌ Error saving dive log:', err.stack || err.message || err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
