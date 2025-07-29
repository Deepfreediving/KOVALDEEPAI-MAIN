import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface DiveLog {
  id: string;
  [key: string]: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ Ensure POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, localLogs = [] }: { userId: string; localLogs: DiveLog[] } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  if (!Array.isArray(localLogs)) {
    return res.status(400).json({ error: 'Invalid localLogs array' });
  }

  const WIX_BASE_URL = process.env.WIX_BASE_URL || 'https://www.deepfreediving.com/_functions';

  try {
    // 1️⃣ Fetch logs from Wix
    const wixResponse = await axios.post(`${WIX_BASE_URL}/getDiveLogs`, { userId });

    const wixLogs: DiveLog[] = Array.isArray(wixResponse.data?.logs) ? wixResponse.data.logs : [];
    const wixIds = new Set(wixLogs.map(log => log.id));

    // 2️⃣ Find logs missing in Wix
    const newLogs = localLogs.filter(log => log && log.id && !wixIds.has(log.id));

    // 3️⃣ Upload missing logs to Wix
    for (const log of newLogs) {
      try {
        await axios.post(`${WIX_BASE_URL}/saveDiveLog`, { ...log, userId });
      } catch (uploadErr: any) {
        console.warn(`⚠️ Failed to upload log ${log.id}:`, uploadErr.response?.data || uploadErr.message);
      }
    }

    // 4️⃣ Merge logs (unique by ID)
    const mergedMap = new Map<string, DiveLog>();
    [...wixLogs, ...newLogs].forEach(log => {
      if (log?.id) mergedMap.set(log.id, log);
    });

    return res.status(200).json({ logs: Array.from(mergedMap.values()) });

  } catch (err: any) {
    console.error('❌ Dive log sync error:', err.response?.data || err.message || err);
    return res.status(500).json({ error: 'Failed to sync logs' });
  }
}
