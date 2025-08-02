// pages/api/analyze/save-dive-log.ts
import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import handleCors from '@/utils/cors';
import { saveLogEntry } from '@/utils/diveLogHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (await handleCors(req, res)) return;

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

    const { id, logEntry } = await saveLogEntry(userId, {
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
      surfaceProtocol
    });

    // ✅ Sync to Wix (non-blocking)
    axios.post('https://www.deepfreediving.com/_functions/saveDiveLog', {
      ...logEntry,
      userId,
    }).catch(err => console.error(`⚠️ Wix sync failed for log ${id}:`, err.message));

    return res.status(200).json({ success: true, id });

  } catch (error: any) {
    console.error('❌ Error saving dive log:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
