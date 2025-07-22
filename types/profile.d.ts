export interface UserProfile {
  name: string;
  certificationLevel: "FII Level 1" | "FII Level 2" | "FII Level 3" | string;
  depthPB: number;
  staticApneaPB: string;
  reversePackingDepth?: number;
  mouthfillDepth?: number;
  mouthfillVolume?: "full" | "half" | "unknown";
  trainingFrequency: number;
  primaryDiscipline: "depth" | "static" | "spearfishing" | string;
  warmupRoutine?: string;
  currentIssues?: string[];
  performanceGoal?: string;
}
