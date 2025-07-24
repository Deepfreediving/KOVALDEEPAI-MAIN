// types/coaching.d.ts

declare module '@/lib/coaching/eqEngine' {
  export function getNextEQQuestion(state: {
    currentDepth: number;
    answers?: Record<string, string>;
    alreadyAsked?: string[];
  }): { type: 'question'; question: string; key: string } | { type: 'diagnosis-ready' };

  export function evaluateEQAnswers(answers: Record<string, string>): {
    type: 'diagnosis';
    label: string;
    drills: string[];
  };
}

declare module '@/lib/coaching/profileIntake' {
  export function getMissingProfileField(profile: Record<string, any>): {
    key: string;
    question: string;
  } | null;
}
