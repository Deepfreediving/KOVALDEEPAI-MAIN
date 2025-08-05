// pages/api/analyze/save-dive-log.ts
import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import handleCors from '@/utils/handleCors';
import { saveLogEntry } from '@/utils/diveLogHelpers'; // KEEP this import!

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
    const localLogData = {
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

    // 🌐 STEP 2: Sync to Wix (background) - ENHANCED
    try {
      console.log('🌐 Syncing to Wix backend...');
      
      // Transform data for your Wix http-diveLogs.jsw format
      const wixDiveLogData = {
        userId,
        diveLog: {
          id: localLogData.id,
          date: localLogData.date,
          disciplineType: localLogData.disciplineType,
          discipline: localLogData.discipline,
          location: localLogData.location,
          targetDepth: localLogData.targetDepth,
          reachedDepth: localLogData.reachedDepth,
          notes: localLogData.notes,
          totalDiveTime: localLogData.totalDiveTime,
          mouthfillDepth: localLogData.mouthfillDepth,
          exit: localLogData.exit
        }
      };

      const wixResponse = await axios.post(
        'https://www.deepfreediving.com/_functions/diveLogs',
        wixDiveLogData,
        {
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 15000 // 15 second timeout for Wix backend
        }
      );

      if (wixResponse.status === 200 && wixResponse.data?.success) {
        console.log('✅ Wix backend sync completed successfully');
        
        // Mark as synced in local file with Wix ID
        const updatedLogData = { 
          ...localLogData, 
          syncedToWix: true, 
          wixSyncedAt: new Date().toISOString(),
          wixId: wixResponse.data.data?.[0]?._id
        };
        await saveLogEntry(userId, updatedLogData);
      } else {
        console.warn('⚠️ Wix backend sync failed but local saved:', wixResponse.data);
      }
    } catch (wixError) {
      console.error('❌ Wix backend sync error (but local saved):', (wixError as any).message);
    }

    // ✅ Return immediately with local data (don't wait for Wix)
    res.status(200).json({
      success: true,
      _id: localResult.id,
      localPath: localResult.filePath,
      message: 'Dive log saved locally, syncing to Wix...',
      data: localLogData
    });

  } catch (error: any) {
    console.error('❌ Error in save-dive-log:', error);
    
    return res.status(500).json({
      error: 'Save failed',
      message: error.message || 'Unknown error',
      details: error.response?.data || null
    });
  }
}
