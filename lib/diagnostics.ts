interface LogEntry {
  maxDepth: number;
  issueTags: string[];
}

interface AnalysisResult {
  priority: string;
  notes: string;
}

/**
 * Analyzes a freediving log entry and returns training recommendations.
 */
export function analyzeLog(entry: LogEntry): AnalysisResult {
  // ✅ Validate input
  if (!entry || typeof entry.maxDepth !== "number" || !Array.isArray(entry.issueTags)) {
    return {
      priority: "invalid",
      notes: "Invalid log entry format provided.",
    };
  }

  // Normalize issue tags to lowercase for consistency
  const tags = entry.issueTags.map((tag) => tag.toLowerCase());

  // Rules engine (can be extended later)
  const rules: { condition: boolean; result: AnalysisResult }[] = [
    {
      condition: entry.maxDepth >= 40 && tags.includes("mouthfill compression"),
      result: {
        priority: "mouthfill retraining",
        notes:
          "Depth suggests MF timing or pressure loss. Delay target depth and review MF start point.",
      },
    },
    {
      condition: tags.includes("surface lmc"),
      result: {
        priority: "CO₂ management",
        notes: "Add active recovery and adjust static tolerance training.",
      },
    },
  ];

  // Find first matching rule
  const matchedRule = rules.find((rule) => rule.condition);

  return matchedRule
    ? matchedRule.result
    : {
        priority: "none",
        notes: "No critical patterns detected.",
      };
}
