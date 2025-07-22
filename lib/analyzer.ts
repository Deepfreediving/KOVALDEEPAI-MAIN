// lib/analyzer.ts
import { DiveJournalEntry } from "@/components/models/journal";

// Define known issue clusters by depth
const issueByDepthMap: Record<string, string[]> = {
  "30-35": ["MF timing", "mental hesitation"],
  "35-40": ["MF runs out", "RP volume too small", "mouthfill too early"],
  "40-45": ["EQ fatigue", "glottis leak"],
  "45-50": ["lung squeeze warning", "soft palate locking"],
};

export function detectCommonIssueDepths(logs: DiveJournalEntry[]) {
  const buckets: Record<string, number> = {};

  logs.forEach((entry) => {
    const d = entry.max_depth;
    const bucket = getDepthBucket(d);
    if (bucket) buckets[bucket] = (buckets[bucket] || 0) + 1;
  });

  return Object.entries(buckets)
    .sort((a, b) => b[1] - a[1]) // most frequent first
    .map(([range, count]) => ({ range, count }));
}

function getDepthBucket(depth: number): string | null {
  if (depth >= 30 && depth < 35) return "30-35";
  if (depth >= 35 && depth < 40) return "35-40";
  if (depth >= 40 && depth < 45) return "40-45";
  if (depth >= 45 && depth < 50) return "45-50";
  return null;
}

export function suggestRootCauseTags(depthRange: string): string[] {
  return issueByDepthMap[depthRange] || [];
}
