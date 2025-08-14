// pages/api/analyze/save-dive-log.ts
import { NextApiRequest, NextApiResponse } from 'next';
import handleCors from '@/utils/handleCors';
import { saveLogEntry } from '@/utils/diveLogHelpers'; // KEEP this import!
import WIX_APP_CONFIG from '@/lib/wixAppConfig';
import { compressDiveLogForWix, validateDiveLogData } from '@/utils/diveLogCompression';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // ✅ Handle CORS
    if (handleCors(req, res)) return;

    // ✅ Allow only POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
      userId = 'anonymous',
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

    console.log('💾 Starting dual save process for dive log...');

    // 🚀 STEP 1: Save to LOCAL FILES first (super fast for AI)
    const localLogData: any = {
      id: `dive_${userId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId,
      date,
      disciplineType,
      discipline,
      location,
      targetDepth: parseFloat(targetDepth) || 0,
      reachedDepth: parseFloat(reachedDepth) || 0,
      mouthfillDepth: parseFloat(mouthfillDepth) || 0,
      issueDepth: parseFloat(issueDepth) || 0,
      squeeze,
      exit,
      durationOrDistance,
      attemptType,
      notes,
      totalDiveTime,
      issueComment,
      surfaceProtocol,
      syncedToWix: false, // Track sync status
      source: 'dive-journal-form'
    };

    const localResult = await saveLogEntry(userId, localLogData);
    console.log('✅ Local save completed:', localResult.id);

    // ✅ Return success immediately - don't wait for Wix sync
    res.status(200).json({
      success: true,
      id: localResult.id,
      message: 'Dive log saved successfully',
      syncStatus: 'processing' // Indicates Wix sync is in progress
    });

    // 🌐 STEP 2: Sync to Wix DiveLogs Collection (Background processing)
    (async () => {
      try {
        console.log('🌐 Syncing dive log to Wix DiveLogs collection...');
        
        // ✅ Validate and compress data for Wix DiveLogs repeater
        validateDiveLogData(localLogData);
        const compressedData = compressDiveLogForWix(localLogData);
        
        // Check if compression was successful
        if (compressedData.error) {
          console.error('❌ Data compression failed:', compressedData.error);
          return;
        }
        
        console.log('📦 Compression stats:', {
          originalSize: 'originalSize' in compressedData ? compressedData.originalSize : 0,
          compressedSize: 'compressedSize' in compressedData ? compressedData.compressedSize : 0,
          ratio: ('originalSize' in compressedData && 'compressedSize' in compressedData && compressedData.originalSize) ? 
            `${(((compressedData.originalSize - compressedData.compressedSize) / compressedData.originalSize) * 100).toFixed(1)}%` : 
            'N/A'
        });
        
        // ✅ Format for Wix DiveLogs Repeater - Required fields: diveTime, watchedPhoto, diveDate, logEntry, diveLogId, userId
        const diveLogData = {
          diveLogId: ('diveLogId' in compressedData ? compressedData.diveLogId : null) || localLogData.id,
          userId: ('userId' in compressedData ? compressedData.userId : null) || localLogData.userId,
          diveDate: ('diveDate' in compressedData ? compressedData.diveDate : null) || localLogData.date,
          diveTime: ('diveTime' in compressedData ? compressedData.diveTime : null) || localLogData.totalDiveTime,
          watchedPhoto: ('watchedPhoto' in compressedData ? compressedData.watchedPhoto : null) || null,
          logEntry: ('logEntry' in compressedData ? compressedData.logEntry : null) || JSON.stringify(localLogData),
          squeeze: localLogData.squeeze || false,
          compressed: true,
          syncedAt: new Date().toISOString()
        };

        // 🚀 STEP 3: Save to Wix DiveLogs Collection via API
        const wixResponse = await fetch(`${WIX_APP_CONFIG.FUNCTIONS_BASE_URL}/dive-journal-repeater`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WIX_APP_CONFIG.apiKey || 'dev-mode'}`
          },
          body: JSON.stringify({
            action: 'insert',
            collection: 'DiveLogs',
            data: diveLogData
          })
        });

        if (wixResponse.ok) {
          const wixResult = await wixResponse.json();
          console.log('✅ Dive log synced to Wix DiveLogs collection:', wixResult.data?._id);
          
          // Update local log to mark as synced
          const updatedLogData = {
            ...localLogData,
            syncedToWix: true,
            wixId: wixResult.data?._id
          };
          await saveLogEntry(userId, updatedLogData); // Update local copy
          
        } else {
          console.error('❌ Failed to sync to Wix DiveLogs:', wixResponse.status, await wixResponse.text());
        }

      } catch (wixError) {
        console.error('❌ Wix DiveLogs sync error:', wixError);
        // Don't fail the entire operation - log is still saved locally
      }
    })(); // End background sync

  } catch (error) {
    console.error('❌ Save dive log error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to save dive log'
    });
  }
}
