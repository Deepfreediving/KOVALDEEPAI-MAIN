// utils/analyzeDiveLog.ts
export function analyzeDiveLogText(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const depthData: number[] = [];

  lines.forEach(line => {
    const match = line.match(/(\d+(\.\d+)?)\s*(m|meters)/i);
    if (match) {
      depthData.push(parseFloat(match[1]));
    }
  });

  const descentRates = [];
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
