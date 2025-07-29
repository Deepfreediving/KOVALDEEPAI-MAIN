import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface DiveLog {
  id: string;
  [key: string]: any; // Accept any other fields (flexible schema)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, localLogs = [] }: { userId: string; localLogs: DiveLog[] } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  if (!Array.isArray(localLogs)) {
    return res.status(400).json({ error: 'Invalid localLogs array' });
  }

  try {
    // 1. Fetch logs from Wix
    const wixResponse = await axios.post(
      'https://www.deepfreediving.com/_functions/getDiveLogs',
      { userId }
    );

    const wixLogs: DiveLog[] = Array.isArray(wixResponse.data?.logs) ? wixResponse.data.logs : [];
    const wixIds = new Set(wixLogs.map(log => log.id));

    // 2. Find local logs not present in Wix
    const newLogs = localLogs.filter(log => log && log.id && !wixIds.has(log.id));

    // 3. Upload missing logs to Wix
    for (const log of newLogs) {
      try {
        await axios.post(
          'https://www.deepfreediving.com/_functions/saveDiveLog',
          { ...log, userId } // Ensure userId is included
        );
      } catch (uploadErr) {
        if (uploadErr instanceof Error) {
          console.warn(`⚠️ Failed to upload log ${log.id}:`, uploadErr.message);
        } else {
          console.warn(`⚠️ Failed to upload log ${log.id}:`, uploadErr);
        }
      }
    }

    // 4. Merge and return updated logs
    const mergedMap = new Map<string, DiveLog>();
    [...wixLogs, ...newLogs].forEach(log => mergedMap.set(log.id, log));

    return res.status(200).json({ logs: Array.from(mergedMap.values()) });

  } catch (err: any) {
    console.error('❌ Dive log sync error:', err.message || err);
    return res.status(500).json({ error: 'Failed to sync logs' });
  }
}
