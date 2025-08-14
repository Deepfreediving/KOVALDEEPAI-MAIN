// types/coaching.d.ts

declare module "@/lib/coaching/eqEngine" {
  export interface EQState {
    currentDepth: number;
    answers?: Record<string, string>;
    alreadyAsked?: string[];
  }

  export interface EQQuestionResponse {
    type: "question";
    question: string;
    key: string;
  }

  export interface EQDiagnosisResponse {
    type: "diagnosis-ready";
  }

  export interface EQEvaluationResult {
    type: "diagnosis";
    label: string;
    drills: string[];
  }

  /**
   * Given the current EQ state, determine the next question or if ready for diagnosis.
   */
  export function getNextEQQuestion(
    state: EQState,
  ): EQQuestionResponse | EQDiagnosisResponse;

  /**
   * Evaluate the collected answers and return a diagnosis with drills.
   */
  export function evaluateEQAnswers(
    answers: Record<string, string>,
  ): EQEvaluationResult;
}

declare module "@/lib/coaching/profileIntake" {
  export interface ProfileField {
    key: string;
    question: string;
  }

  /**
   * Checks for missing fields in a profile object and returns the first missing field/question.
   */
  export function getMissingProfileField(
    profile: Record<string, any>,
  ): ProfileField | null;
}
