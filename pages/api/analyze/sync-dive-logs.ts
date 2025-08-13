// ===== 📄 pages/api/analyze/sync-dive-logs-fixed.ts =====
// API endpoint to sync a specific user's dive logs to Wix diveLogs collection
// This is the MASTER version with bidirectional sync, deduplication, and proper endpoints

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import handleCors from '@/utils/handleCors';

// Configuration
const DIVE_LOGS_DIR = path.join(process.cwd(), 'data', 'diveLogs');

interface DiveLog {
  id?: string;
  userId?: string;
  date?: string;
  discipline?: string;
  disciplineType?: string;
  location?: string;
  targetDepth?: number;
  reachedDepth?: number;
  notes?: string;
  timestamp?: string;
  source?: string;
  originalFile?: string;
  totalDiveTime?: string;
  mouthfillDepth?: number;
  exit?: string;
  [key: string]: any;
}

interface LocalLog extends DiveLog {
  syncedToWix?: boolean;
  wixId?: string;
  wixSyncedAt?: string;
}

interface WixLog extends DiveLog {
  _id?: string;
  uniqueKey?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // ✅ Handle CORS
    if (handleCors(req, res)) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('🔄 Starting authenticated user dive logs sync...');
    
    // ✅ STEP 1: Get userId from request body (must be provided by authenticated frontend)
    const { userId } = req.body;
    
    if (!userId || userId.startsWith('guest-')) {
      return res.status(400).json({
        success: false,
        error: 'Valid authenticated userId required for sync'
      });
    }
    
    console.log(`� Syncing dive logs for authenticated user: ${userId}`);

    // ✅ STEP 2: Load local dive logs from both files and directories
    let localLogs: LocalLog[] = [];
    
    // Load from user-specific file
    const filePath = path.join(DIVE_LOGS_DIR, `${userId}.json`);
    let currentLogs: LocalLog[] = [];
    
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      currentLogs = JSON.parse(fileContent);
    }

    // Also load from individual log files and subdirectories
    if (fs.existsSync(DIVE_LOGS_DIR)) {
      const files = fs.readdirSync(DIVE_LOGS_DIR);
      
      for (const file of files) {
        const fullPath = path.join(DIVE_LOGS_DIR, file);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          // Check subdirectory for logs
          const subFiles = fs.readdirSync(fullPath);
          for (const subFile of subFiles) {
            if (subFile.endsWith('.json')) {
              try {
                const subContent = fs.readFileSync(path.join(fullPath, subFile), 'utf8');
                const parsed = JSON.parse(subContent);
                const logsArray = Array.isArray(parsed) ? parsed : [parsed];
                localLogs.push(...logsArray.map((log: any) => ({
                  ...log,
                  userId,
                  source: 'local',
                  originalFile: `${file}/${subFile}`
                })));
              } catch (error) {
                console.warn(`Warning: Could not parse ${file}/${subFile}:`, error);
              }
            }
          }
        } else if (file.endsWith('.json') && file !== `${userId}.json`) {
          // Individual log files
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const parsed = JSON.parse(content);
            const logsArray = Array.isArray(parsed) ? parsed : [parsed];
            localLogs.push(...logsArray.map((log: any) => ({
              ...log,
              userId,
              source: 'local',
              originalFile: file
            })));
          } catch (error) {
            console.warn(`Warning: Could not parse ${file}:`, error);
          }
        }
      }
    }

    // Add current logs to the collection
    localLogs.push(...currentLogs);

    // 🌐 STEP 3: Sync with Wix backend (BIDIRECTIONAL)
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
      console.warn('⚠️ Wix sync error:', wixError instanceof Error ? wixError.message : String(wixError));
    }

    // 📦 STEP 4: Merge and deduplicate all logs
    console.log('🔄 Merging and deduplicating logs...');
    
    const allLogs: LocalLog[] = [...localLogs, ...wixLogs];
    const uniqueLogs = allLogs.reduce((acc: LocalLog[], log: LocalLog) => {
      const existingIndex = acc.findIndex((existing: LocalLog) =>
        (existing.id && log.id && existing.id === log.id) ||
        (existing.date === log.date && 
         existing.discipline === log.discipline && 
         existing.location === log.location &&
         existing.targetDepth === log.targetDepth)
      );
      
      if (existingIndex >= 0) {
        // Merge properties, keeping the one with more data
        const existing = acc[existingIndex];
        acc[existingIndex] = {
          ...existing,
          ...log,
          // Preserve sync status
          syncedToWix: existing.syncedToWix || log.syncedToWix,
          wixId: existing.wixId || log.wixId,
          wixSyncedAt: existing.wixSyncedAt || log.wixSyncedAt
        };
      } else {
        acc.push(log);
      }
      
      return acc;
    }, []);

    // Sort by date (newest first)
    uniqueLogs.sort((a: LocalLog, b: LocalLog) => {
      const dateA = new Date(a.date || a.timestamp || '1970-01-01').getTime();
      const dateB = new Date(b.date || b.timestamp || '1970-01-01').getTime();
      return dateB - dateA;
    });

    // ✅ STEP 5: Save updated logs back to local file
    console.log('💾 Saving merged logs to local file...');
    
    // Ensure directory exists
    if (!fs.existsSync(DIVE_LOGS_DIR)) {
      fs.mkdirSync(DIVE_LOGS_DIR, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(uniqueLogs, null, 2));

    // 📊 STEP 6: Return results
    const result = {
      success: true,
      message: 'Dive logs synced successfully',
      stats: {
        totalLogs: uniqueLogs.length,
        localLogsFound: localLogs.length,
        wixLogsFound: wixLogs.length,
        uploadedToWix: uploadedCount,
        duplicatesRemoved: allLogs.length - uniqueLogs.length
      },
      logs: uniqueLogs
    };

    console.log('✅ Sync completed:', result.stats);
    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ Sync error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during sync'
    });
  }
}
