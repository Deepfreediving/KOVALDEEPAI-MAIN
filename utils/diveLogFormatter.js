// ✅ Dive Log Formatter - Creates structured, compressed dive log format
// This creates the organized format that appears in sidebar and gets sent to Wix repeater

/**
 * Formats a dive log into a structured, compressed text format
 * @param {Object} diveLog - The dive log data from the form
 * @returns {string} - Formatted dive log text
 */
export function formatDiveLogStructured(diveLog) {
  const {
    date,
    discipline,
    location,
    targetDepth,
    reachedDepth,
    mouthfillDepth,
    issueDepth,
    issueComment,
    notes,
    difficulty,
    attemptType,
    breathHoldTime,
    surfaceTime,
    warmupTime
  } = diveLog;

  // Build the structured format
  let formatted = [];
  
  // Header line with date, discipline, and location
  formatted.push(`📅 ${date || 'Unknown'} | 🏊‍♂️ ${discipline || 'Freedive'} | 📍 ${location || 'Unknown'}`);
  
  // Depth line
  formatted.push(`🎯 Target: ${targetDepth || '?'}m → 🏁 Reached: ${reachedDepth || '?'}m`);
  
  // Additional details line (if any)
  let details = [];
  if (mouthfillDepth) details.push(`💨 Mouthfill: ${mouthfillDepth}m`);
  if (issueDepth) details.push(`⚠️ Issue: ${issueComment || 'at ' + issueDepth + 'm'}`);
  if (difficulty) details.push(`⭐ ${difficulty}`);
  if (attemptType) details.push(`🎪 ${attemptType}`);
  
  if (details.length > 0) {
    formatted.push(details.join(' | '));
  }
  
  // Times line (if any)
  let times = [];
  if (breathHoldTime) times.push(`🫁 Hold: ${breathHoldTime}s`);
  if (surfaceTime) times.push(`🌊 Surface: ${surfaceTime}s`);
  if (warmupTime) times.push(`🔥 Warmup: ${warmupTime}s`);
  
  if (times.length > 0) {
    formatted.push(times.join(' | '));
  }
  
  // Notes line
  if (notes && notes.trim()) {
    formatted.push(`📝 ${notes.trim()}`);
  }
  
  return formatted.join('\n');
}

/**
 * Creates a short summary for the sidebar display
 * @param {Object} diveLog - The dive log data
 * @returns {string} - Short summary
 */
export function formatDiveLogSummary(diveLog) {
  const depth = diveLog.reachedDepth || diveLog.targetDepth || '?';
  const discipline = diveLog.discipline || 'Freedive';
  const location = diveLog.location || 'Unknown';
  const date = diveLog.date ? new Date(diveLog.date).toLocaleDateString() : 'Unknown';
  
  return `${depth}m ${discipline} at ${location} (${date})`;
}

/**
 * Prepares dive log data for AI analysis
 * @param {Object} diveLog - The dive log data
 * @returns {string} - AI-ready analysis prompt
 */
export function prepareDiveLogForAI(diveLog) {
  const structured = formatDiveLogStructured(diveLog);
  
  return `Please analyze this dive log and provide coaching feedback:

${structured}

Focus on:
- Performance analysis (depth achieved vs target)
- Technique observations (any issues or successes)
- Safety considerations
- Specific recommendations for improvement
- Progressive training suggestions

Provide personalized coaching feedback based on Daniel Koval's freediving methods.`;
}

/**
 * Formats a dive log specifically for the Wix UserMemory repeater
 * Creates a clean, structured text that will be stored as the main display content
 * @param {Object} diveLog - The dive log data
 * @returns {string} - Formatted text for repeater display
 */
export function formatDiveLogForRepeater(diveLog) {
  const {
    date,
    discipline,
    location,
    targetDepth,
    reachedDepth,
    mouthfillDepth,
    issueDepth,
    issueComment,
    notes,
    exit,
    durationOrDistance,
    attemptType,
    surfaceProtocol
  } = diveLog;

  // Create a clean, structured format for the repeater
  let sections = [];
  
  // Main dive info
  sections.push(`${discipline || 'Freedive'} at ${location || 'Unknown'}`);
  sections.push(`Target: ${targetDepth}m → Reached: ${reachedDepth}m`);
  
  // Performance details
  if (mouthfillDepth) sections.push(`Mouthfill: ${mouthfillDepth}m`);
  if (exit) sections.push(`Exit: ${exit}`);
  if (durationOrDistance) sections.push(`Duration: ${durationOrDistance}`);
  if (attemptType) sections.push(`Type: ${attemptType}`);
  if (surfaceProtocol) sections.push(`Surface: ${surfaceProtocol}`);
  
  // Issues and notes
  if (issueDepth) {
    sections.push(`Issue at ${issueDepth}m: ${issueComment || 'See notes'}`);
  }
  if (notes && notes.trim()) {
    sections.push(`Notes: ${notes.trim()}`);
  }
  
  return sections.join(' | ');
}

// ✅ Export alias for backward compatibility
export const formatDiveLogForDisplay = formatDiveLogStructured;
