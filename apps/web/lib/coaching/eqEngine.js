// /lib/coaching/eqEngine.js

import { EQ_QUESTIONS } from "./coachingQuestions";

/* ------------------------------------------
   Part 1: Next EQ Question (adaptive state machine)
------------------------------------------ */

export function getNextEQQuestion(state) {
  const { currentDepth, answers = {}, alreadyAsked = [] } = state;

  // Log for debugging
  console.log('Processing EQ question with answers:', Object.keys(answers).length);

  const depthKey = getDepthKey(currentDepth);
  const questions = EQ_QUESTIONS[depthKey] || [];

  for (const question of questions) {
    if (!alreadyAsked.includes(question)) {
      return {
        type: "question",
        question,
        key: createKeyFromText(question),
      };
    }
  }

  // All questions asked — ready for diagnosis
  return { type: "diagnosis-ready" };
}

/* ------------------------------------------
   Part 2: Evaluate Answers → Suggest Diagnosis + Drills
------------------------------------------ */

export function evaluateEQAnswers(answers) {
  const normalized = normalizeAnswers(answers);

  // Example: Mouthfill not started + panic
  if (
    normalized.mouthfill_used === "still_using_frenzel" &&
    normalized.panic_or_urgency === "yes"
  ) {
    return {
      type: "diagnosis",
      label: "Likely late transition or stress-induced EQ block",
      drills: [
        "Dry mouthfill timing drill (simulate 20m fill)",
        "EQ table with passive exhale focus",
        "Frenzel-to-mouthfill transition dry drill",
      ],
    };
  }

  // Example: Mouthfill slips at 30m+
  if (
    normalized.mouthfill_used === "yes" &&
    normalized.mouthfill_loss === "yes"
  ) {
    return {
      type: "diagnosis",
      label: "Mouthfill leakage at depth",
      drills: [
        "Jaw/tongue seal strengthening (pipe + balloon work)",
        "Chin tuck and hold-pressure drill",
        "Inverted descent simulation with low-volume hold",
      ],
    };
  }

  // Fallback
  return {
    type: "diagnosis",
    label: "General pressure adaptation issue",
    drills: [
      "Air management dry EQ table",
      "Passive descent technique with minimal effort",
      "Mask & sinus warm-up sequence before diving",
    ],
  };
}

/* ------------------------------------------
   Part 3: Utilities
------------------------------------------ */

function getDepthKey(depth) {
  if (depth <= 10) return "0-10m";
  if (depth <= 20) return "10-20m";
  if (depth <= 30) return "20-30m";
  if (depth <= 40) return "30-40m";
  if (depth <= 60) return "40-60m";
  return ">60m";
}

function createKeyFromText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeAnswers(answers) {
  const out = {};
  for (const [key, value] of Object.entries(answers)) {
    out[key.toLowerCase().replace(/[^a-z0-9]+/g, "_")] = value
      .trim()
      .toLowerCase();
  }
  return out;
}
