import fs from 'fs';
import path from 'path';
import handleCors from '@/utils/handleCors';
import { NextApiRequest, NextApiResponse } from 'next';

const DIVE_LOGS_DIR = path.join(process.cwd(), 'data', 'diveLogs');

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
  userId?: string;
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

  try {
    console.log('🔄 Starting authenticated user dive logs sync...');
    
    // ✅ STEP 1: Get userId from request (must be provided by authenticated frontend)
    const { userId } = req.body;
    
    if (!userId || userId.startsWith('guest-')) {
      return res.status(400).json({
        success: false,
        error: 'Valid authenticated userId required for sync'
      });
    }
    
    console.log(`👤 Syncing dive logs for authenticated user: ${userId}`);

    // ✅ STEP 2: Load local dive logs from all sources
    const allLocalLogs: LocalLog[] = [];
    
    // Check if dive logs directory exists
    if (!fs.existsSync(DIVE_LOGS_DIR)) {
      return res.status(404).json({
        success: false,
        error: 'No local dive logs directory found'
      });
    }

    // Read all dive log files and subdirectories
    const files = fs.readdirSync(DIVE_LOGS_DIR);
    
    for (const file of files) {
      const filePath = path.join(DIVE_LOGS_DIR, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile() && file.endsWith('.json')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const diveLog = JSON.parse(content);
          
          // Only include logs that belong to this user or have no userId (orphaned logs)
          if (!diveLog.userId || diveLog.userId === userId) {
            // Add userId if missing
            if (!diveLog.userId) {
              diveLog.userId = userId;
            }
            allLocalLogs.push(diveLog);
          }
        } catch (parseError) {
          console.warn(`⚠️ Could not parse dive log file ${file}`);
        }
      } else if (stat.isDirectory()) {
        // Check subdirectories
        try {
          const subFiles = fs.readdirSync(filePath);
          for (const subFile of subFiles) {
            if (subFile.endsWith('.json')) {
              const subFilePath = path.join(filePath, subFile);
              try {
                const content = fs.readFileSync(subFilePath, 'utf8');
                const diveLog = JSON.parse(content);
                
                // Only include logs that belong to this user
                if (!diveLog.userId || diveLog.userId === userId) {
                  if (!diveLog.userId) {
                    diveLog.userId = userId;
                  }
                  allLocalLogs.push(diveLog);
                }
              } catch (parseError) {
                console.warn(`⚠️ Could not parse dive log file ${file}/${subFile}`);
              }
            }
          }
        } catch (subDirError) {
          console.warn(`⚠️ Could not read subdirectory ${file}`);
        }
      }
    }

    console.log(`📊 Found ${allLocalLogs.length} local dive logs for user ${userId}`);

    if (allLocalLogs.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No dive logs found to sync',
        syncedCount: 0
      });
    }

    // ✅ STEP 3: Sync each dive log to Wix UserMemory collection
    let syncedCount = 0;
    const errors = [];

    for (const diveLog of allLocalLogs) {
      try {
        // Format for UserMemory collection
        const memoryEntry = {
          userId: userId,
          memoryContent: `Dive Log: ${diveLog.discipline} at ${diveLog.location}, reached ${diveLog.reachedDepth}m (target: ${diveLog.targetDepth}m). ${diveLog.notes || 'No additional notes.'}`,
          logEntry: JSON.stringify(diveLog), // Store complete dive log as JSON
          sessionName: `Dive Log - ${diveLog.date}`,
          timestamp: diveLog.timestamp || new Date().toISOString(),
          metadata: {
            type: 'dive-log',
            source: 'api-sync',
            discipline: diveLog.discipline,
            location: diveLog.location,
            targetDepth: diveLog.targetDepth,
            reachedDepth: diveLog.reachedDepth,
            date: diveLog.date,
            userId: userId
          }
        };

        // Send to Wix UserMemory endpoint
        const wixResponse = await fetch('https://www.deepfreediving.com/_functions/userMemory', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(memoryEntry)
        });

        if (wixResponse.ok) {
          syncedCount++;
          console.log(`✅ Synced: ${diveLog.discipline} dive (${diveLog.reachedDepth}m)`);
        } else {
          const errorText = await wixResponse.text();
          errors.push({
            dive: `${diveLog.discipline} ${diveLog.date}`,
            error: `HTTP ${wixResponse.status}: ${errorText}`
          });
          console.warn(`❌ Failed to sync ${diveLog.discipline} dive:`, wixResponse.status);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (syncError) {
        errors.push({
          dive: `${diveLog.discipline} ${diveLog.date}`,
          error: syncError instanceof Error ? syncError.message : String(syncError)
        });
        console.error(`❌ Error syncing dive log:`, syncError);
      }
    }

    const response = {
      success: true,
      message: `Sync completed: ${syncedCount}/${allLocalLogs.length} dive logs synced to UserMemory`,
      syncedCount,
      totalCount: allLocalLogs.length,
      userId,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`✅ API Sync completed: ${syncedCount}/${allLocalLogs.length} dive logs synced for user ${userId}`);

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ API Sync failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Sync failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
