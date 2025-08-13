// utils/analyzeDiveLog.ts

/**
 * Analyze dive log text for depth data and descent rates
 */
export function analyzeDiveLogText(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const depthData: number[] = [];

  lines.forEach(line => {
    const match = line.match(/(\d+(\.\d+)?)\s*(m|meters)/i);
    if (match) {
      depthData.push(parseFloat(match[1]));
    }
  });

  const descentRates: number[] = [];
  for (let i = 1; i < depthData.length; i++) {
    const rate = depthData[i] - depthData[i - 1];
    descentRates.push(rate);
  }

  // Detect descent speed changes
  const changes = descentRates.map((rate, i) => ({
    index: i,
    rate,
    warning: Math.abs(rate) < 0.5 ? 'Possible sink phase/hang' : null,
  }));

  return {
    depthData,
    descentRates,
    changes,
  };
}

/**
 * Generate a human-readable dive coaching summary
 */
export function generateDiveReport(analysis: ReturnType<typeof analyzeDiveLogText>): string {
  if (!analysis.depthData.length) {
    return "No valid depth data detected. Please ensure the dive log text includes depth values.";
  }

  const maxDepth = Math.max(...analysis.depthData);
  const avgRate = analysis.descentRates.length
    ? analysis.descentRates.reduce((a, b) => a + b, 0) / analysis.descentRates.length
    : 0;

  let report = `Your maximum depth was **${maxDepth}m**.`;
  report += avgRate
    ? ` Your average descent rate was **${avgRate.toFixed(2)} m/s**, indicating a consistent pace.`
    : " No descent rate data available.";

  const slowSegments = analysis.changes.filter(c => c.warning);
  if (slowSegments.length) {
    report += ` There were ${slowSegments.length} slow segments, suggesting possible hangs or buoyancy pauses.`;
  }

  report += " Keep practicing equalization and streamlining for smoother dives.";

  return report;
}
