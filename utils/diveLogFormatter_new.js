// ✅ Dive Log Formatter - Creates structured, compressed dive log format
// This creates the organized format that appears in sidebar and gets sent to Wix DiveLogs repeater

/**
 * Formats a dive log for display in the sidebar and UI
 * @param {Object} diveLog - The dive log data from the form or DiveLogs collection
 * @returns {string} - Formatted dive log text for display
 */
export function formatDiveLogForDisplay(diveLog) {
  if (!diveLog) return 'Invalid dive log';

  const {
    date,
    disciplineType = 'depth',
    discipline,
    location,
    targetDepth,
    reachedDepth,
    mouthfillDepth,
    issueDepth,
    issueComment,
    notes,
    attemptType,
    totalDiveTime,
    durationOrDistance,
    exit,
    squeeze,
    surfaceProtocol
  } = diveLog;

  // Build the display format
  let formatted = [];
  
  // Header line with date, discipline, and location
  const disciplineDisplay = discipline || (disciplineType === 'depth' ? 'Depth' : 'Pool/Static');
  formatted.push(`📅 ${date || 'Unknown'} | 🏊‍♂️ ${disciplineDisplay} | 📍 ${location || 'Unknown'}`);
  
  // Main performance line
  if (disciplineType === 'depth') {
    formatted.push(`🎯 Target: ${targetDepth || '?'}m → 🏁 Reached: ${reachedDepth || '?'}m`);
  } else {
    // Pool/Static disciplines
    if (durationOrDistance) {
      formatted.push(`🏁 Result: ${durationOrDistance}`);
    }
  }
  
  // Additional details line (if any)
  let details = [];
  if (mouthfillDepth) details.push(`💨 Mouthfill: ${mouthfillDepth}m`);
  if (issueDepth) details.push(`⚠️ Issue: ${issueComment || 'at ' + issueDepth + 'm'}`);
  if (squeeze) details.push(`🔴 Squeeze`);
  if (attemptType) details.push(`🎪 ${attemptType}`);
  if (exit) details.push(`🚪 ${exit}`);
  
  if (details.length > 0) {
    formatted.push(details.join(' | '));
  }
  
  // Times line (if any)
  let times = [];
  if (totalDiveTime) times.push(`🫁 Total: ${totalDiveTime}`);
  if (surfaceProtocol) times.push(`🌊 Surface: ${surfaceProtocol}`);
  
  if (times.length > 0) {
    formatted.push(times.join(' | '));
  }
  
  // Notes line (if provided)
  if (notes && notes.trim()) {
    const noteText = notes.length > 100 ? notes.substring(0, 100) + '...' : notes;
    formatted.push(`📝 ${noteText}`);
  }
  
  return formatted.join('\n');
}

/**
 * Formats a dive log for AI analysis - more detailed version
 * @param {Object} diveLog - The dive log data
 * @returns {string} - Formatted dive log text for AI analysis
 */
export function formatDiveLogForAnalysis(diveLog) {
  if (!diveLog) return 'Invalid dive log data';

  const {
    date,
    disciplineType = 'depth', 
    discipline,
    location,
    targetDepth,
    reachedDepth,
    mouthfillDepth,
    issueDepth,
    issueComment,
    notes,
    attemptType,
    totalDiveTime,
    durationOrDistance,
    exit,
    squeeze,
    surfaceProtocol,
    timestamp
  } = diveLog;

  // Structured format for AI analysis
  let analysis = [];
  
  analysis.push(`=== DIVE LOG ANALYSIS ===`);
  analysis.push(`Date: ${date || 'Unknown'}`);
  analysis.push(`Timestamp: ${timestamp || 'Unknown'}`);
  analysis.push(`Discipline Type: ${disciplineType}`);
  analysis.push(`Discipline: ${discipline || 'Not specified'}`);
  analysis.push(`Location: ${location || 'Not specified'}`);
  
  if (disciplineType === 'depth') {
    analysis.push(`Target Depth: ${targetDepth || 'Not specified'}m`);
    analysis.push(`Reached Depth: ${reachedDepth || 'Not specified'}m`);
    if (mouthfillDepth) analysis.push(`Mouthfill Depth: ${mouthfillDepth}m`);
    if (issueDepth) analysis.push(`Issue Depth: ${issueDepth}m`);
  } else {
    if (durationOrDistance) analysis.push(`Performance: ${durationOrDistance}`);
  }
  
  if (attemptType) analysis.push(`Attempt Type: ${attemptType}`);
  if (totalDiveTime) analysis.push(`Total Dive Time: ${totalDiveTime}`);
  if (exit) analysis.push(`Exit Type: ${exit}`);
  if (squeeze) analysis.push(`Squeeze: YES`);
  if (surfaceProtocol) analysis.push(`Surface Protocol: ${surfaceProtocol}`);
  
  if (issueComment && issueComment.trim()) {
    analysis.push(`Issue Comment: ${issueComment}`);
  }
  
  if (notes && notes.trim()) {
    analysis.push(`Notes: ${notes}`);
  }
  
  analysis.push(`=== END DIVE LOG ===`);
  
  return analysis.join('\n');
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
 * Formats a dive log specifically for the Wix DiveLogs repeater
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
