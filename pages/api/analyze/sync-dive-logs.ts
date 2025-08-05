// REPLACE the entire file with this corrected version:

import fs from 'fs';
import path from 'path';
import handleCors from '@/utils/handleCors';
import { NextApiRequest, NextApiResponse } from 'next';

const DIVE_LOGS_DIR = path.join(process.cwd(), 'dive-logs');

// Ensure directory exists
if (!fs.existsSync(DIVE_LOGS_DIR)) {
  fs.mkdirSync(DIVE_LOGS_DIR, { recursive: true });
}

interface WixLog {
  uniqueKey?: string;
  _id: string;
  date: string;
  discipline: string;
  disciplineType: string;
  location: string;
  targetDepth: number;
  reachedDepth: number;
  notes?: string;
  timestamp?: string;
}

interface LocalLog {
  id: string;
  date: string;
  discipline: string;
  disciplineType: string;
  location: string;
  targetDepth: number;
  reachedDepth: number;
  notes?: string;
  timestamp?: string;
  syncedToWix?: boolean;
  wixId?: string;
  wixSyncedAt?: string;
  totalDiveTime?: string;
  mouthfillDepth?: number;
  exit?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, localLogs = [] }: { userId: string; localLogs: LocalLog[] } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    console.log(`🔄 Syncing dive logs for user ${userId}...`);
    
    // 📦 STEP 1: Load current local logs
    const filePath = path.join(DIVE_LOGS_DIR, `${userId}.json`);
    let currentLogs: LocalLog[] = [];
    
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      currentLogs = JSON.parse(fileContent);
    }

    // 🌐 STEP 2: Sync with Wix backend
    let wixLogs: LocalLog[] = [];
    let uploadedCount = 0;

    try {
      console.log('🌐 Fetching from Wix diveLogs backend...');
      
      // ✅ CORRECTED: Use diveLogs endpoint, not userMemory
      const wixFetchResponse = await fetch(`https://www.deepfreediving.com/_functions/diveLogs?userId=${userId}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (wixFetchResponse.ok) {
        const wixData = await wixFetchResponse.json();
        if (wixData.success && wixData.data) {
          // Transform Wix format to local format
          wixLogs = wixData.data.map((log: WixLog) => ({
            id: log.uniqueKey || log._id,
            date: log.date,
            discipline: log.discipline,
            disciplineType: log.disciplineType,
            location: log.location,
            targetDepth: log.targetDepth,
            reachedDepth: log.reachedDepth,
            notes: log.notes || '',
            timestamp: log.timestamp || new Date().toISOString(),
            syncedToWix: true,
            wixId: log._id,
            wixSyncedAt: new Date().toISOString()
          }));
          
          console.log(`✅ Fetched ${wixLogs.length} logs from Wix diveLogs collection`);
        }
      }

      // Upload local logs that aren't synced yet
      const unSyncedLogs = localLogs.filter((log: LocalLog) => !log.syncedToWix);
      
      for (const log of unSyncedLogs) {
        try {
          console.log(`🔄 Uploading log ${log.id} to Wix diveLogs collection...`);
          
          // ✅ CORRECTED: Use diveLogs endpoint, not userMemory
          const wixUploadResponse = await fetch('https://www.deepfreediving.com/_functions/diveLogs', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              userId,
              diveLog: {
                id: log.id,
                date: log.date,
                disciplineType: log.disciplineType,
                discipline: log.discipline,
                location: log.location,
                targetDepth: log.targetDepth,
                reachedDepth: log.reachedDepth,
                notes: log.notes || '',
                totalDiveTime: log.totalDiveTime,
                mouthfillDepth: log.mouthfillDepth,
                exit: log.exit
              }
            })
          });

          if (wixUploadResponse.ok) {
            const uploadData = await wixUploadResponse.json();
            if (uploadData.success) {
              // Mark as synced
              log.syncedToWix = true;
              log.wixId = uploadData.data?.[0]?._id;
              log.wixSyncedAt = new Date().toISOString();
              uploadedCount++;
              console.log(`✅ Uploaded log ${log.id} to Wix diveLogs collection`);
            }
          }
        } catch (uploadError) {
          console.warn(`⚠️ Failed to upload log ${log.id}:`, uploadError instanceof Error ? uploadError.message : String(uploadError));
        }
      }

    } catch (wixError) {
      console.warn('⚠️ Wix sync failed:', wixError instanceof Error ? wixError.message : String(wixError));
    }

    // 🔄 STEP 3: Merge and deduplicate logs
    const allLogs: LocalLog[] = [...localLogs, ...wixLogs];
    const uniqueLogs = allLogs.reduce((acc: LocalLog[], log: LocalLog) => {
      const existingIndex = acc.findIndex((existing: LocalLog) => 
        existing.id === log.id || 
        existing.wixId === log.wixId ||
        (existing.date === log.date && existing.targetDepth === log.targetDepth)
      );
      
      if (existingIndex === -1) {
        acc.push(log);
      } else {
        // Keep the one with more complete data
        if (log.syncedToWix && !acc[existingIndex].syncedToWix) {
          acc[existingIndex] = { ...acc[existingIndex], ...log };
        }
      }
      
      return acc;
    }, []);

    // Sort by date (newest first)
    uniqueLogs.sort((a: LocalLog, b: LocalLog) => {
      const dateA = new Date(a.date || a.timestamp || 0).getTime();
      const dateB = new Date(b.date || b.timestamp || 0).getTime();
      return dateB - dateA;
    });

    // 💾 STEP 4: Save merged logs locally
    fs.writeFileSync(filePath, JSON.stringify(uniqueLogs, null, 2));

    console.log(`✅ Sync completed: ${uniqueLogs.length} total logs, ${uploadedCount} uploaded to Wix`);

    return res.status(200).json({
      success: true,
      message: `Sync completed: ${uniqueLogs.length} total logs, ${uploadedCount} uploaded to Wix`,
      logs: uniqueLogs,
      uploadedCount,
      totalCount: uniqueLogs.length
    });

  } catch (error) {
    console.error('❌ Sync failed:', error);
    return res.status(500).json({
      error: 'Sync failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}