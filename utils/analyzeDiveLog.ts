// utils/analyzeDiveLog.ts

interface DivePhase {
  phase: 'descent' | 'bottom' | 'ascent';
  startTime: number;
  endTime: number;
  startDepth: number;
  endDepth: number;
  duration: number;
  rate: number;
}

interface DiveMetrics {
  maxDepth: number;
  totalTime: number;
  descentTime: number;
  bottomTime: number;
  ascentTime: number;
  avgDescentRate: number;
  avgAscentRate: number;
  surfaceInterval?: number;
  safetyStops: Array<{depth: number, duration: number}>;
}

/**
 * Enhanced dive log analysis for freediving profiles
 * Handles time-depth data, ascent/descent rates, and safety analysis
 */
export function analyzeDiveLogText(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  
  // ✅ Extract depth and time data
  const timeDepthData: Array<{time: number, depth: number}> = [];
  const depthData: number[] = [];
  const timeData: number[] = [];
  
  console.log("🔍 Analyzing dive log text for time-depth patterns...");
  
  lines.forEach((line, index) => {
    // Match time:depth patterns (e.g., "1:30 - 25m", "00:45 12.5m")
    const timeDepthMatch = line.match(/(\d{1,2}):(\d{2})\s*[-:]*\s*(\d+(?:\.\d+)?)\s*m/i);
    if (timeDepthMatch) {
      const minutes = parseInt(timeDepthMatch[1]);
      const seconds = parseInt(timeDepthMatch[2]);
      const totalSeconds = minutes * 60 + seconds;
      const depth = parseFloat(timeDepthMatch[3]);
      
      timeDepthData.push({ time: totalSeconds, depth });
      timeData.push(totalSeconds);
      depthData.push(depth);
      
      console.log(`📊 Found time-depth: ${minutes}:${seconds} at ${depth}m`);
    }
    
    // Also match standalone depth values
    const depthMatch = line.match(/(\d+(?:\.\d+)?)\s*(m|meters)/i);
    if (depthMatch && !timeDepthMatch) {
      const depth = parseFloat(depthMatch[1]);
      depthData.push(depth);
    }
    
    // Match time patterns for duration analysis
    const timeMatch = line.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch && !timeDepthMatch) {
      const minutes = parseInt(timeMatch[1]);
      const seconds = parseInt(timeMatch[2]);
      timeData.push(minutes * 60 + seconds);
    }
  });

  // ✅ Calculate dive phases and rates
  const phases = calculateDivePhases(timeDepthData);
  const metrics = calculateDiveMetrics(timeDepthData, depthData, timeData);
  
  // ✅ Analyze descent rates and patterns
  const descentRates: number[] = [];
  const ascentRates: number[] = [];
  
  for (let i = 1; i < timeDepthData.length; i++) {
    const prev = timeDepthData[i - 1];
    const curr = timeDepthData[i];
    const timeDiff = curr.time - prev.time;
    const depthDiff = curr.depth - prev.depth;
    
    if (timeDiff > 0) {
      const rate = depthDiff / timeDiff; // m/s
      
      if (rate > 0) {
        descentRates.push(rate);
      } else if (rate < 0) {
        ascentRates.push(Math.abs(rate));
      }
    }
  }

  // ✅ Detect performance issues
  const issues = detectDiveIssues(timeDepthData, descentRates, ascentRates, metrics);
  
  // ✅ Legacy compatibility
  const changes = descentRates.map((rate, i) => ({
    index: i,
    rate,
    warning: rate < 0.5 ? "Possible sink phase/hang" : null,
  }));

  console.log(`✅ Analysis complete: ${depthData.length} depths, ${timeDepthData.length} time-depth points`);
  console.log(`📊 Max depth: ${metrics.maxDepth}m, Avg descent: ${metrics.avgDescentRate.toFixed(2)}m/s`);

  return {
    depthData,
    timeDepthData,
    descentRates,
    ascentRates,
    changes, // Legacy compatibility
    phases,
    metrics,
    issues,
  };
}

/**
 * Calculate dive phases (descent, bottom time, ascent)
 */
function calculateDivePhases(timeDepthData: Array<{time: number, depth: number}>): DivePhase[] {
  if (timeDepthData.length < 3) return [];
  
  const phases: DivePhase[] = [];
  const maxDepthPoint = timeDepthData.reduce((max, curr) => 
    curr.depth > max.depth ? curr : max
  );
  
  // Find descent phase (start to max depth)
  const descentStart = timeDepthData[0];
  const descentEnd = maxDepthPoint;
  
  if (descentEnd.time > descentStart.time) {
    phases.push({
      phase: 'descent',
      startTime: descentStart.time,
      endTime: descentEnd.time,
      startDepth: descentStart.depth,
      endDepth: descentEnd.depth,
      duration: descentEnd.time - descentStart.time,
      rate: (descentEnd.depth - descentStart.depth) / (descentEnd.time - descentStart.time)
    });
  }
  
  // Find ascent phase (max depth to end)
  const ascentStart = maxDepthPoint;
  const ascentEnd = timeDepthData[timeDepthData.length - 1];
  
  if (ascentEnd.time > ascentStart.time) {
    phases.push({
      phase: 'ascent',
      startTime: ascentStart.time,
      endTime: ascentEnd.time,
      startDepth: ascentStart.depth,
      endDepth: ascentEnd.depth,
      duration: ascentEnd.time - ascentStart.time,
      rate: Math.abs((ascentEnd.depth - ascentStart.depth) / (ascentEnd.time - ascentStart.time))
    });
  }
  
  return phases;
}

/**
 * Calculate comprehensive dive metrics
 */
function calculateDiveMetrics(
  timeDepthData: Array<{time: number, depth: number}>,
  depthData: number[],
  timeData: number[]
): DiveMetrics {
  const maxDepth = Math.max(...depthData, 0);
  const totalTime = timeData.length ? Math.max(...timeData) : 0;
  
  const phases = calculateDivePhases(timeDepthData);
  const descentPhase = phases.find(p => p.phase === 'descent');
  const ascentPhase = phases.find(p => p.phase === 'ascent');
  
  return {
    maxDepth,
    totalTime,
    descentTime: descentPhase?.duration || 0,
    bottomTime: 0, // Calculate if needed
    ascentTime: ascentPhase?.duration || 0,
    avgDescentRate: descentPhase?.rate || 0,
    avgAscentRate: ascentPhase?.rate || 0,
    safetyStops: [], // Extract from text if available
  };
}

/**
 * Detect common freediving performance issues
 */
function detectDiveIssues(
  timeDepthData: Array<{time: number, depth: number}>,
  descentRates: number[],
  ascentRates: number[],
  metrics: DiveMetrics
): string[] {
  const issues: string[] = [];
  
  // Check descent rate issues
  if (metrics.avgDescentRate < 0.5) {
    issues.push("🐌 Slow descent rate detected - may indicate improper weighting or inefficient sink phase");
  }
  
  if (metrics.avgDescentRate > 2.0) {
    issues.push("⚡ Very fast descent - consider checking equalization technique and safety");
  }
  
  // Check for inconsistent descent (hangs/pauses)
  const slowSections = descentRates.filter(rate => rate < 0.3).length;
  if (slowSections > 2) {
    issues.push("⏸️ Multiple slow sections detected - possible equalization difficulties or buoyancy issues");
  }
  
  // Check ascent rate
  if (metrics.avgAscentRate < 0.5) {
    issues.push("🔼 Slow ascent rate - may indicate fatigue or over-weighting");
  }
  
  if (metrics.avgAscentRate > 1.0) {
    issues.push("🚀 Fast ascent rate - consider controlled ascent for safety");
  }
  
  // Check total dive time efficiency
  const expectedDiveTime = (metrics.maxDepth * 2) + 30; // Rough estimate
  if (metrics.totalTime > expectedDiveTime * 1.5) {
    issues.push("⏰ Extended dive time - focus on efficiency and streamlining");
  }
  
  return issues;
}

/**
 * Generate enhanced dive coaching summary with specific actionable feedback
 */
export function generateDiveReport(
  analysis: ReturnType<typeof analyzeDiveLogText>,
): string {
  if (!analysis.depthData.length) {
    return "No valid depth data detected. Please ensure the dive log includes depth values and timestamps for detailed analysis.";
  }

  const { metrics, issues, phases } = analysis;
  
  let report = `**🤿 Dive Analysis Report**\n\n`;
  
  // Basic metrics
  report += `📏 **Maximum Depth:** ${metrics.maxDepth}m\n`;
  report += `⏱️ **Total Dive Time:** ${Math.round(metrics.totalTime)}s\n`;
  
  if (metrics.avgDescentRate > 0) {
    report += `⬇️ **Average Descent Rate:** ${metrics.avgDescentRate.toFixed(2)}m/s\n`;
  }
  
  if (metrics.avgAscentRate > 0) {
    report += `⬆️ **Average Ascent Rate:** ${metrics.avgAscentRate.toFixed(2)}m/s\n`;
  }
  
  // Phase analysis
  if (phases.length > 0) {
    report += `\n**📊 Dive Phases:**\n`;
    phases.forEach(phase => {
      report += `• ${phase.phase}: ${phase.duration}s at ${phase.rate.toFixed(2)}m/s\n`;
    });
  }
  
  // Issues and recommendations
  if (issues.length > 0) {
    report += `\n**⚠️ Areas for Improvement:**\n`;
    issues.forEach(issue => {
      report += `• ${issue}\n`;
    });
  } else {
    report += `\n✅ **Great dive profile!** Your technique shows good consistency and control.\n`;
  }
  
  // Coaching recommendations
  report += `\n**💡 Coaching Tips:**\n`;
  
  if (metrics.avgDescentRate < 0.8) {
    report += `• Work on proper weighting and sink phase technique\n`;
    report += `• Practice relaxed descent with minimal movement\n`;
  }
  
  if (metrics.avgDescentRate > 0.8 && metrics.avgDescentRate < 1.2) {
    report += `• Excellent descent rate! Maintain this consistent pace\n`;
  }
  
  report += `• Continue practicing equalization for smooth depth changes\n`;
  report += `• Focus on streamlined body position throughout the dive\n`;

  return report;
}
