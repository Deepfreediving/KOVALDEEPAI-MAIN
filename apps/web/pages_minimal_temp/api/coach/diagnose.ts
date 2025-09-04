// ENCLOSE Diagnostic API - Analyzes dive performance using Daniel's methodology
import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminClient } from '@/lib/supabase';

// Simplified ENCLOSE diagnostic for now - will import from core package once built
interface DiveIssue {
  category: 'Equalization' | 'Narcosis' | 'CO2' | 'Leg Burn' | 'O2' | 'Squeeze' | 'Equipment';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendations: string[];
  diagnosis: string;
  rootCauses: string[];
  trainingDrills: string[];
  nextSteps: string[];
  safetyFlags: string[];
}

// ENCLOSE diagnostic function
function performENCLOSEDiagnostic(diveData: any): DiveIssue[] {
  const issues: DiveIssue[] = [];
  
  // E - Equalization Issues
  if (diveData.eqFailure || diveData.mouthfillIssues) {
    issues.push({
      category: 'Equalization',
      priority: 'critical',
      description: 'Equalization failure detected',
      recommendations: [
        'Review mouthfill mechanics and timing',
        'Practice 100+ daily dry EQ reps',
        'Check soft palate and glottis control'
      ],
      diagnosis: 'Equalization technique breakdown',
      rootCauses: ['Improper mouthfill timing', 'Glottis control issues'],
      trainingDrills: ['Dry EQ practice', 'Mouthfill drills'],
      nextSteps: ['Focus on technique refinement'],
      safetyFlags: ['Stop at first EQ failure']
    });
  }
  
  // N - Narcosis  
  if (diveData.confusion || diveData.tunnelVision) {
    issues.push({
      category: 'Narcosis',
      priority: 'high',
      description: 'Nitrogen narcosis symptoms detected',
      recommendations: [
        'Progress slowly in 2-3m increments',
        'Focus on mental preparation techniques'
      ],
      diagnosis: 'Nitrogen narcosis affecting performance',
      rootCauses: ['Insufficient depth adaptation'],
      trainingDrills: ['Mental training', 'Gradual depth progression'],
      nextSteps: ['Conservative depth increase'],
      safetyFlags: ['Monitor mental clarity']
    });
  }
  
  // C - CO2 Tolerance
  if (diveData.earlyContractions) {
    issues.push({
      category: 'CO2',
      priority: 'medium',
      description: 'Early contractions indicate CO2 sensitivity',
      recommendations: [
        'Work on CO2 tolerance tables',
        'Practice relaxation techniques'
      ],
      diagnosis: 'CO2 tolerance needs improvement',
      rootCauses: ['Insufficient breath hold training'],
      trainingDrills: ['CO2 tables', 'Relaxation training'],
      nextSteps: ['Improve breath hold capacity'],
      safetyFlags: []
    });
  }
  
  return issues;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.headers['x-user-id'] as string;
    const { diveLogId, performanceData } = req.body;

    let diveData = performanceData;

    // If diveLogId provided, fetch from database
    if (diveLogId) {
      const supabase = getAdminClient();
      const { data: diveLog, error } = await supabase
        .from('dive_logs')
        .select('*')
        .eq('id', diveLogId)
        .single();

      if (error || !diveLog) {
        return res.status(404).json({ error: 'Dive log not found' });
      }

      // Map database fields to ENCLOSE format (cast to any for type safety)
      const log = diveLog as any;
      diveData = {
        targetDepthM: log.target_depth || log.reached_depth,
        reachedDepthM: log.reached_depth,
        diveTimeSeconds: log.total_dive_time ? 
          parseTime(log.total_dive_time) : 0,
        discipline: 'CWT', // Default, could be stored in metadata
        
        // Extract issues from metadata or notes
        eqFailureDepth: log.issue_depth,
        squeezeType: log.squeeze ? 'unknown' : undefined,
        mouthfillDepth: log.mouthfill_depth,
        
        // Parse notes for additional issues
        ...parseNotesForIssues(log.notes || ''),
        ...parseMetadataForIssues(log.metadata || {})
      };
    }

    if (!diveData) {
      return res.status(400).json({ error: 'Dive performance data required' });
    }

    // Run ENCLOSE diagnostic  
    const assessments = performENCLOSEDiagnostic(diveData);

    // Format response
    const response = {
      success: true,
      diveData: {
        target: `${diveData.targetDepthM}m`,
        reached: `${diveData.reachedDepthM}m`, 
        performance: `${Math.round((diveData.reachedDepthM / diveData.targetDepthM) * 100)}%`
      },
      assessments: assessments.map(assessment => ({
        category: getEncloseCategory(assessment.category),
        priority: assessment.priority,
        diagnosis: assessment.diagnosis,
        rootCauses: assessment.rootCauses,
        recommendations: assessment.recommendations,
        trainingDrills: assessment.trainingDrills,
        nextSteps: assessment.nextSteps,
        safetyFlags: assessment.safetyFlags
      })),
      summary: {
        criticalIssues: assessments.filter(a => a.priority === 'critical').length,
        highPriorityIssues: assessments.filter(a => a.priority === 'high').length,
        totalIssues: assessments.length,
        safeToContinue: !assessments.some(a => 
          a.priority === 'critical' || a.safetyFlags.length > 0
        )
      },
      coachingAdvice: generateCoachingAdvice(assessments),
      metadata: {
        methodology: "Daniel Koval's E.N.C.L.O.S.E. diagnostic model",
        analyzedAt: new Date().toISOString()
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('ENCLOSE diagnostic error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze dive performance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper functions
function parseTime(timeString: string): number {
  if (!timeString) return 0;
  
  // Handle MM:SS format
  const parts = timeString.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  
  // Handle seconds only
  return parseInt(timeString) || 0;
}

function parseNotesForIssues(notes: string) {
  const issues: any = {};
  
  if (notes.toLowerCase().includes('early contractions')) {
    issues.contractionsStartTime = 30; // Estimate
  }
  
  if (notes.toLowerCase().includes('leg burn')) {
    issues.legBurnDepth = 20; // Estimate
  }
  
  if (notes.toLowerCase().includes('narcosis')) {
    issues.narcosisSymptoms = ['confusion'];
  }
  
  return issues;
}

function parseMetadataForIssues(metadata: any) {
  const issues: any = {};
  
  if (metadata.earSqueeze) {
    issues.squeezeType = 'ear';
  }
  
  if (metadata.lungSqueeze) {
    issues.squeezeType = 'lung';
  }
  
  return issues;
}

function getEncloseCategory(category: string): string {
  const categories = {
    'E': 'Equalization',
    'N': 'Narcosis', 
    'C': 'CO2 Tolerance',
    'L': 'Leg Burn',
    'O': 'O2 Tolerance',
    'S': 'Squeeze',
    'E2': 'Equipment'
  };
  return categories[category as keyof typeof categories] || category;
}

function generateCoachingAdvice(assessments: any[]): string[] {
  const advice: string[] = [];
  
  if (assessments.length === 0) {
    advice.push("Excellent dive! No major issues detected.");
    advice.push("Continue current training approach and consider progressive depth increase.");
    return advice;
  }
  
  const critical = assessments.filter(a => a.priority === 'critical');
  const high = assessments.filter(a => a.priority === 'high');
  
  if (critical.length > 0) {
    advice.push("🚨 CRITICAL: Stop depth progression immediately.");
    advice.push("Focus on correcting critical issues before continuing.");
  }
  
  if (high.length > 0) {
    advice.push("⚠️ High priority issues detected - address before next session.");
  }
  
  // Prioritize equalization issues
  const eqIssues = assessments.filter(a => a.category === 'E');
  if (eqIssues.length > 0) {
    advice.push("Focus on equalization technique - foundation for all depth diving.");
  }
  
  // Add general coaching based on patterns
  const categories = assessments.map(a => a.category);
  if (categories.includes('E') && categories.includes('S')) {
    advice.push("Equalization + squeeze = technique issue. Work with instructor.");
  }
  
  return advice;
}
