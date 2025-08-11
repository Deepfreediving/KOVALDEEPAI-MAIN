// pages/api/analyze/save-dive-log-optimized.ts
// OPTIMIZED VERSION: Single batch processing for dive logs

import { NextApiRequest, NextApiResponse } from 'next';
import handleCors from '@/utils/handleCors';
import { saveLogEntry } from '@/utils/diveLogHelpers';

// ✅ COMPACT DATA STRUCTURE - All fields in one object
interface CompactDiveLog {
  // Core metadata
  id: string;
  userId: string;
  timestamp: string;
  
  // Dive data - all fields in single object
  dive: {
    date: string;
    disciplineType: string;
    discipline: string;
    location: string;
    depths: {
      target: number;
      reached: number;
      mouthfill: number;
      issue: number;
    };
    performance: {
      exit: string;
      duration: string;
      totalTime: string;
      attemptType: string;
      surfaceProtocol: string;
    };
    issues: {
      squeeze: boolean;
      issueComment: string;
    };
    notes: string;
  };
  
  // Auto-calculated fields
  analysis: {
    progressionScore: number;
    riskFactors: string[];
    technicalNotes: string;
    depthAchievement: number;
  };
  
  // Sync status
  sync: {
    local: boolean;
    wix: boolean;
    analyzed: boolean;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const startTime = Date.now();
    console.log('🚀 OPTIMIZED: Starting batch dive log processing...');

    // ✅ STEP 1: Create compact dive log object (SINGLE OPERATION)
    const compactLog = createCompactDiveLog(req.body);
    
    console.log(`✅ OPTIMIZED: Compact log created in ${Date.now() - startTime}ms`);

    // ✅ STEP 2: Single batch save operation
    const saveResult = await saveDiveLogBatch(compactLog);
    
    console.log(`✅ OPTIMIZED: Batch save completed in ${Date.now() - startTime}ms`);

    // ✅ STEP 3: Single analysis operation (background)
    triggerBackgroundAnalysis(compactLog);

    // ✅ Return immediate success
    res.status(200).json({
      success: true,
      id: compactLog.id,
      processingTime: Date.now() - startTime,
      data: {
        dive: compactLog.dive,
        analysis: compactLog.analysis,
        sync: compactLog.sync
      },
      message: 'Dive log processed in batch mode'
    });

  } catch (error) {
    console.error('❌ OPTIMIZED: Batch processing failed:', error);
    res.status(500).json({ 
      error: 'Batch processing failed', 
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

// ✅ COMPACT LOG CREATOR - Single function for all processing
function createCompactDiveLog(formData: any): CompactDiveLog {
  const userId = formData.userId || 'anonymous';
  const timestamp = new Date().toISOString();
  const id = `dive_${userId}_${Date.now()}`;

  // Parse all numeric values at once
  const targetDepth = parseFloat(formData.targetDepth) || 0;
  const reachedDepth = parseFloat(formData.reachedDepth) || 0;
  const mouthfillDepth = parseFloat(formData.mouthfillDepth) || 0;
  const issueDepth = parseFloat(formData.issueDepth) || 0;

  // Calculate analysis fields in batch
  const depthAchievement = targetDepth > 0 ? (reachedDepth / targetDepth) * 100 : 0;
  const progressionScore = calculateProgressionScore(formData, depthAchievement);
  const riskFactors = identifyRiskFactors(formData);
  const technicalNotes = extractTechnicalNotes(formData);

  return {
    id,
    userId,
    timestamp,
    dive: {
      date: formData.date || '',
      disciplineType: formData.disciplineType || '',
      discipline: formData.discipline || '',
      location: formData.location || '',
      depths: {
        target: targetDepth,
        reached: reachedDepth,
        mouthfill: mouthfillDepth,
        issue: issueDepth
      },
      performance: {
        exit: formData.exit || '',
        duration: formData.durationOrDistance || '',
        totalTime: formData.totalDiveTime || '',
        attemptType: formData.attemptType || '',
        surfaceProtocol: formData.surfaceProtocol || ''
      },
      issues: {
        squeeze: Boolean(formData.squeeze),
        issueComment: formData.issueComment || ''
      },
      notes: formData.notes || ''
    },
    analysis: {
      progressionScore,
      riskFactors,
      technicalNotes,
      depthAchievement
    },
    sync: {
      local: false,
      wix: false,
      analyzed: false
    }
  };
}

// ✅ BATCH SAVE - Single operation for all storage
async function saveDiveLogBatch(compactLog: CompactDiveLog) {
  try {
    // Convert to legacy format for existing save function
    const legacyFormat = {
      id: compactLog.id,
      timestamp: compactLog.timestamp,
      userId: compactLog.userId,
      date: compactLog.dive.date,
      disciplineType: compactLog.dive.disciplineType,
      discipline: compactLog.dive.discipline,
      location: compactLog.dive.location,
      targetDepth: compactLog.dive.depths.target,
      reachedDepth: compactLog.dive.depths.reached,
      mouthfillDepth: compactLog.dive.depths.mouthfill,
      issueDepth: compactLog.dive.depths.issue,
      exit: compactLog.dive.performance.exit,
      durationOrDistance: compactLog.dive.performance.duration,
      totalDiveTime: compactLog.dive.performance.totalTime,
      attemptType: compactLog.dive.performance.attemptType,
      surfaceProtocol: compactLog.dive.performance.surfaceProtocol,
      squeeze: compactLog.dive.issues.squeeze,
      issueComment: compactLog.dive.issues.issueComment,
      notes: compactLog.dive.notes,
      // Include analysis
      progressionScore: compactLog.analysis.progressionScore,
      riskFactors: compactLog.analysis.riskFactors,
      technicalNotes: compactLog.analysis.technicalNotes,
      depthAchievement: compactLog.analysis.depthAchievement
    };

    const result = await saveLogEntry(compactLog.userId, legacyFormat);
    compactLog.sync.local = true;
    
    return result;
  } catch (error) {
    console.error('❌ Batch save failed:', error);
    throw error;
  }
}

// ✅ BACKGROUND ANALYSIS - Non-blocking
function triggerBackgroundAnalysis(compactLog: CompactDiveLog) {
  // Don't await this - let it run in background
  (async () => {
    try {
      const baseUrl = process.env.BASE_URL || 'https://kovaldeepai-main.vercel.app';
      
      const response = await fetch(`${baseUrl}/api/analyze/single-dive-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diveLogId: compactLog.id,
          userId: compactLog.userId,
          diveLogData: compactLog
        })
      });

      if (response.ok) {
        console.log('✅ Background analysis completed for:', compactLog.id);
      }
    } catch (error) {
      console.warn('⚠️ Background analysis failed:', error);
    }
  })();
}

// ✅ HELPER FUNCTIONS - Optimized for batch processing
function calculateProgressionScore(data: any, depthAchievement: number): number {
  const baseScore = Math.min(100, depthAchievement);
  const comfortBonus = data.exit === 'Good' ? 10 : 0;
  const issuesPenalty = data.issueDepth > 0 ? -20 : 0;
  return Math.max(0, Math.min(100, baseScore + comfortBonus + issuesPenalty));
}

function identifyRiskFactors(data: any): string[] {
  const risks = [];
  if (data.squeeze) risks.push('squeeze-reported');
  if (data.issueDepth > 0) risks.push('depth-issue');
  if (data.exit !== 'Good') risks.push('difficult-exit');
  if (data.reachedDepth > data.targetDepth * 1.1) risks.push('depth-exceeded');
  return risks;
}

function extractTechnicalNotes(data: any): string {
  const notes = [];
  if (data.mouthfillDepth > 0) notes.push(`Mouthfill at ${data.mouthfillDepth}m`);
  if (data.issueComment) notes.push(`Issue: ${data.issueComment}`);
  if (data.surfaceProtocol) notes.push(`Surface: ${data.surfaceProtocol}`);
  return notes.join(' | ');
}
