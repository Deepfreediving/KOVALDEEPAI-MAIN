export function analyzeLog(entry) {
  const { maxDepth, issueTags } = entry;

  if (maxDepth >= 40 && issueTags.includes("mouthfill compression")) {
    return {
      priority: "mouthfill retraining",
      notes: "Depth suggests MF timing or pressure loss. Delay target depth and review MF start point.",
    };
  }

  if (issueTags.includes("surface LMC")) {
    return {
      priority: "CO₂ management",
      notes: "Add active recovery and adjust static tolerance training.",
    };
  }

  return {
    priority: "none",
    notes: "No critical patterns detected.",
  };
}
