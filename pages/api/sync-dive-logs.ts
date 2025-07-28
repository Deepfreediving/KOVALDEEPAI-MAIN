import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, localLogs = [] }: { userId: string; localLogs: { id: string }[] } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    // 1. Fetch logs from Wix
    const wixResponse = await axios.post(
      'https://www.deepfreediving.com/_functions/getDiveLogs',
      { userId }
    );
    const wixLogs: { id: string }[] = wixResponse.data?.logs || [];

    // 2. De-duplicate
    const wixIds = new Set(wixLogs.map(log => log.id));
    const newLogs = localLogs.filter((log: { id: string }) => !wixIds.has(log.id));

    // 3. Upload local-only logs to Wix
    for (const log of newLogs) {
      await axios.post(
        'https://www.deepfreediving.com/_functions/saveDiveLog',
        log
      );
    }

    const merged = [...wixLogs, ...newLogs];
    res.status(200).json({ logs: merged });
  } catch (err: any) {
    console.error('❌ Dive log sync error:', err.message || err);
    res.status(500).json({ error: 'Failed to sync logs' });
  }
}
