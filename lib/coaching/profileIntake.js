const REQUIRED_FIELDS = [
  "name",
  "experienceLevel",
  "discipline",
  "personalBestDepth",
  "mouthfillUsage",
  "injuryHistory",
  "goalDepth",
  "trainingFocus"
];

// Friendly question prompts for each field
const PROFILE_QUESTIONS = {
  name: "Before we get started, what’s your name or nickname you'd like me to use?",
  experienceLevel: "How would you describe your freediving experience? (Beginner, Intermediate, Advanced)",
  discipline: "Which discipline are you training for? (CWT, FIM, CNF, Pool)",
  personalBestDepth: "What’s your current personal best depth?",
  mouthfillUsage: "Are you currently using mouthfill, or reverse packing, and what is the depth you begin and end your last mouthfill?",
  injuryHistory: "Have you ever had any injuries while diving (e.g., squeeze, barotrauma)?",
  goalDepth: "What depth are you aiming for next, what is your Personal best depth?",
  trainingFocus: "What do you want to focus on most in your training right now? (EQ, Relaxation, CO₂, Mental)"
};

/**
 * Check for missing or skipped profile fields.
 * This will only run during first-time setup or when user explicitly updates their profile.
 * 
 * @param {Record<string, any>} profileData - user's profile
 * @returns {{ key: string, question: string } | null}
 */
export function getMissingProfileField(profileData) {
  for (const field of REQUIRED_FIELDS) {
    const value = profileData[field]?.toString().toLowerCase().trim();

    if (!value || value === "skip" || value === "none") {
      return {
        key: field,
        question: PROFILE_QUESTIONS[field]
      };
    }
  }

  return null; // All required fields completed or intentionally skipped
}
