export interface UserProfile {
  userId: string;
  certLevel: string;
  pbDepth: number;
  staticPB: string;
  reversePackDepth?: number;
  mouthfillDepth?: number;
  mouthfillVolume?: string;
  trainingDaysPerWeek: number;
  primaryDiscipline: string;
  warmupRoutine: string;
  goals: string;
  currentIssues: string[];
  mentalTriggers?: string[];
  physiologyNotes?: string[];
}
