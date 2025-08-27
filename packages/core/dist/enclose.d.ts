export interface DivePerformanceData {
    targetDepthM: number;
    reachedDepthM: number;
    diveTimeSeconds: number;
    discipline: 'CWT' | 'CNF' | 'FIM' | 'Static' | 'Dynamic';
    eqFailureDepth?: number;
    eqFailureType?: 'cant_equalize' | 'painful' | 'air_ran_out' | 'swallowed_mouthfill';
    contractionsStartTime?: number;
    legBurnDepth?: number;
    narcosisDepth?: number;
    narcosisSymptoms?: string[];
    o2Symptoms?: string[];
    squeezeType?: 'ear' | 'sinus' | 'lung' | 'throat';
    equipmentIssues?: string[];
    mouthfillDepth?: number;
    mouthfillSize?: 'quarter' | 'half' | 'three_quarter' | 'full';
    mouthfillLost?: boolean;
    neckPosition?: 'extended' | 'neutral' | 'tucked';
    descentStyle?: 'tense' | 'relaxed' | 'rushed';
}
export interface EncloseAssessment {
    category: 'E' | 'N' | 'C' | 'L' | 'O' | 'S' | 'E2';
    priority: 'critical' | 'high' | 'medium' | 'low';
    diagnosis: string;
    rootCauses: string[];
    recommendations: string[];
    trainingDrills: string[];
    nextSteps: string[];
    safetyFlags: string[];
}
export declare function diagnoseWithEnclose(data: DivePerformanceData): EncloseAssessment[];
