// pages/api/analyze/save-dive-log.ts
import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import handleCors from '@/utils/handleCors'; // ✅ CHANGED from cors to handleCors
import { saveLogEntry } from '@/utils/diveLogHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // ✅ Use handleCors
    if (handleCors(req, res)) return; // Early exit for OPTIONS

    // ✅ Allow only POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

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

    // ✅ Validate required fields
    if (!userId || !date || !discipline) {
      return res.status(400).json({
        error: 'Missing required fields',
        requiredFields: ['userId', 'date', 'discipline'],
      });
    }

    // ✅ Parse and sanitize numeric fields safely
    const safeParseFloat = (value: any) => {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    };

    const logData = {
      date: new Date(date).toISOString(),
      disciplineType: String(disciplineType || ''),
      discipline: String(discipline || ''),
      location: String(location || ''),
      targetDepth: safeParseFloat(targetDepth),
      reachedDepth: safeParseFloat(reachedDepth),
      mouthfillDepth: safeParseFloat(mouthfillDepth),
      issueDepth: safeParseFloat(issueDepth),
      squeeze: Boolean(squeeze),
      exit: String(exit || ''),
      durationOrDistance: String(durationOrDistance || ''),
      attemptType: String(attemptType || ''),
      notes: String(notes || ''),
      totalDiveTime: String(totalDiveTime || ''),
      issueComment: String(issueComment || ''),
      surfaceProtocol: String(surfaceProtocol || ''),
    };

    // ✅ Save log entry locally (DB or storage)
    const { id, logEntry } = await saveLogEntry(userId, logData);

    // ✅ Sync to Wix (non-blocking, with improved logging)
    axios
      .post(
        'https://www.deepfreediving.com/_functions/saveDiveLog',
        { ...logEntry, userId },
        { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
      )
      .then(() => {
        console.log(`✅ Wix sync successful for log ${id}`);
      })
      .catch((err) => {
        console.error(`⚠️ Wix sync failed for log ${id}:`, err?.response?.data || err.message);
      });

    return res.status(200).json({ success: true, id });

  } catch (error: any) {
    console.error('❌ Error saving dive log:', error?.stack || error.message || error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error?.message || 'Unknown error',
    });
  }
}
