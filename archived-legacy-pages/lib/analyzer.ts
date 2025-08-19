// lib/analyzer.ts
import { DiveJournalEntry } from "@/components/models/journal";

// Centralized depth range config
const depthBuckets: {
  range: string;
  min: number;
  max: number;
  issues: string[];
}[] = [
  {
    range: "30-35",
    min: 30,
    max: 35,
    issues: ["MF timing", "mental hesitation"],
  },
  {
    range: "35-40",
    min: 35,
    max: 40,
    issues: ["MF runs out", "RP volume too small", "mouthfill too early"],
  },
  { range: "40-45", min: 40, max: 45, issues: ["EQ fatigue", "glottis leak"] },
  {
    range: "45-50",
    min: 45,
    max: 50,
    issues: ["lung squeeze warning", "soft palate locking"],
  },
];

/**
 * Detects the most common depth ranges in the dive logs.
 */
export function detectCommonIssueDepths(logs: DiveJournalEntry[]) {
  if (!Array.isArray(logs)) return [];

  const buckets: Record<string, number> = {};

  logs.forEach((entry) => {
    if (!entry || typeof entry.maxDepth !== "number") return;
    const bucket = getDepthBucket(entry.maxDepth);
    if (bucket) {
      buckets[bucket] = (buckets[bucket] || 0) + 1;
    }
  });

  return Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .map(([range, count]) => ({ range, count }));
}

/**
 * Returns the matching depth range for a given depth.
 */
function getDepthBucket(depth: number): string | null {
  const match = depthBuckets.find((b) => depth >= b.min && depth < b.max);
  return match ? match.range : null;
}

/**
 * Suggests root cause tags for a given depth range.
 */
export function suggestRootCauseTags(depthRange: string): string[] {
  const match = depthBuckets.find((b) => b.range === depthRange);
  return match ? match.issues : [];
}
