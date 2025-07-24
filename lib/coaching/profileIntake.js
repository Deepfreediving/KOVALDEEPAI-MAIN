// lib/coaching/profileIntake.js

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

export function getMissingProfileField(profileData) {
  for (const field of REQUIRED_FIELDS) {
    if (!profileData[field]) {
      return {
        key: field,
        question: PROFILE_QUESTIONS[field]
      };
    }
  }

  return null; // All fields are complete
}
