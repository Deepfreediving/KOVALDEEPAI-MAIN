// types/coaching.d.ts

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
