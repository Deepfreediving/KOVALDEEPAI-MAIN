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

    // ✅ Return success immediately - don't wait for Wix sync
    res.status(200).json({
      success: true,
      id: localResult.id,
      message: 'Dive log saved successfully',
      syncStatus: 'processing' // Indicates Wix sync is in progress
    });

    // 🌐 STEP 2: Sync to Wix UserMemory Collection (Background processing)
    (async () => {
      try {
        console.log('🌐 Syncing dive log to Wix UserMemory collection...');
        
        // ✅ Format for Wix UserMemory Repeater - Optimized for Pattern Analysis
        const userMemoryData = {
          userId,
          dataset: 'UserMemory-@deepfreediving/kovaldeepai-app/Import1', // ✅ Target specific dataset
          title: `${localLogData.discipline} - ${localLogData.location} (${localLogData.reachedDepth}m)`,
          date: localLogData.date,
          discipline: localLogData.discipline,
          disciplineType: localLogData.disciplineType,
          location: localLogData.location,
          targetDepth: localLogData.targetDepth,
          reachedDepth: localLogData.reachedDepth,
          mouthfillDepth: localLogData.mouthfillDepth || 0,
          issueDepth: localLogData.issueDepth || 0,
          issueComment: localLogData.issueComment || '',
          exit: localLogData.exit,
          durationOrDistance: localLogData.durationOrDistance,
          attemptType: localLogData.attemptType,
          notes: localLogData.notes,
          totalDiveTime: localLogData.totalDiveTime || '',
          surfaceProtocol: localLogData.surfaceProtocol || '',
          squeeze: localLogData.squeeze || false,
          timestamp: localLogData.timestamp,
          // ✅ Analysis fields for AI pattern recognition
          progressionScore: calculateProgressionScore(localLogData),
          riskFactors: identifyRiskFactors(localLogData),
          technicalNotes: extractTechnicalNotes(localLogData),
          // ✅ Metadata for systematic analysis
          metadata: {
            type: 'dive-journal-entry',
            analysisStatus: 'pending',
            patternAnalysisNeeded: true,
            source: 'koval-ai-widget',
            version: '2.0'
          }
        };

        // ✅ Helper functions for AI analysis preparation
        function calculateProgressionScore(log: any): number {
          // Simple progression scoring (0-100)
          const depthRatio = (log.reachedDepth / log.targetDepth) * 100;
          const comfortBonus = log.exit === 'Good' ? 10 : 0;
          const issuesPenalty = log.issueDepth > 0 ? -20 : 0;
          return Math.max(0, Math.min(100, depthRatio + comfortBonus + issuesPenalty));
        }

        function identifyRiskFactors(log: any): string[] {
          const risks = [];
          if (log.squeeze) risks.push('squeeze-reported');
          if (log.issueDepth > 0) risks.push('depth-issue');
          if (log.exit !== 'Good') risks.push('difficult-exit');
          if (log.reachedDepth > log.targetDepth * 1.1) risks.push('depth-exceeded');
          return risks;
        }

        function extractTechnicalNotes(log: any): string {
          const notes = [];
          if (log.mouthfillDepth > 0) notes.push(`Mouthfill at ${log.mouthfillDepth}m`);
          if (log.issueComment) notes.push(`Issue: ${log.issueComment}`);
          if (log.surfaceProtocol) notes.push(`Surface: ${log.surfaceProtocol}`);
          return notes.join(' | ');
        }

        // ✅ Save to UserMemory collection (your 50GB permanent storage)
        const wixResponse = await axios.post(
          'https://www.deepfreediving.com/_functions/userMemory',
          userMemoryData,
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
      } catch (wixError: any) {
        // ✅ Enhanced error handling for Wix sync
        const errorMessage = wixError.response?.data?.error || wixError.message || 'Unknown error';
        const errorStatus = wixError.response?.status || 'Unknown';
        
        console.error(`❌ Wix backend sync error (but local saved): ${errorStatus} - ${errorMessage}`);
        
        // ✅ Don't fail the entire request - local save succeeded
        // Mark the log as needing sync retry
        try {
          const retryLogData = { 
            ...localLogData, 
            syncedToWix: false,
            wixSyncError: errorMessage,
            wixSyncErrorAt: new Date().toISOString(),
            needsWixSync: true
          };
          await saveLogEntry(userId, retryLogData);
          console.log('✅ Marked dive log for Wix sync retry');
        } catch (markError) {
          console.warn('⚠️ Could not mark log for sync retry:', markError);
        }
      }
    })(); // Self-executing async function for background processing

    // 🧠 STEP 3: Record to Memory System for AI Analysis (Background processing)
    (async () => {
      try {
        console.log('🧠 Recording dive log to memory system for AI analysis...');
        
        // Call our own record-memory API
        const memoryResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze/record-memory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            log: {
              date: localLogData.date,
              disciplineType: localLogData.disciplineType,
              discipline: localLogData.discipline,
              location: localLogData.location,
              targetDepth: localLogData.targetDepth,
              reachedDepth: localLogData.reachedDepth,
              mouthfillDepth: localLogData.mouthfillDepth,
              issueDepth: localLogData.issueDepth,
              issueComment: localLogData.issueComment,
              durationOrDistance: localLogData.durationOrDistance,
              totalDiveTime: localLogData.totalDiveTime,
              attemptType: localLogData.attemptType,
              exit: localLogData.exit,
              surfaceProtocol: localLogData.surfaceProtocol,
              squeeze: localLogData.squeeze,
              notes: localLogData.notes
            },
            threadId: null, // Let record-memory generate a proper thread ID
            userId: userId || 'anonymous-user'
          })
        });

        if (memoryResponse.ok) {
          const memoryData = await memoryResponse.json();
          console.log('✅ Dive log recorded to memory with AI analysis:', memoryData.coachingReport ? 'Analysis generated' : 'No analysis');
        } else {
          console.warn('⚠️ Memory recording failed but dive log saved');
        }
      } catch (memoryError) {
        console.error('❌ Memory recording error (but dive log saved):', (memoryError as any).message);
      }
    })(); // Self-executing async function for background processing

  } catch (error: any) {
    console.error('❌ Error in save-dive-log:', error);
    
    return res.status(500).json({
      error: 'Save failed',
      message: error.message || 'Unknown error',
      details: error.response?.data || null
    });
  }
}
