// tests/test-compressed-dive-log-structure.js
// Test the new compressed dive log structure for AI analysis

console.log("🔍 Testing Compressed Dive Log Structure for AI Analysis\n");

// Simulate the new userMemory.jsw POST logic
function createCompressedDiveLogStructure(
  diveLogData,
  userId = "test-user-123",
) {
  const timestamp = new Date().toISOString();
  const diveLogId = `dive_${userId}_${Date.now()}`;

  // Parse numeric values (same as in userMemory.jsw)
  const targetDepth = parseFloat(diveLogData.targetDepth) || 0;
  const reachedDepth = parseFloat(diveLogData.reachedDepth) || 0;
  const mouthfillDepth = parseFloat(diveLogData.mouthfillDepth) || 0;
  const issueDepth = parseFloat(diveLogData.issueDepth) || 0;

  // Calculate analysis fields (same as in userMemory.jsw)
  const depthAchievement =
    targetDepth > 0 ? (reachedDepth / targetDepth) * 100 : 0;
  const progressionScore = Math.max(
    0,
    Math.min(
      100,
      depthAchievement +
        (diveLogData.exit === "Good" ? 10 : 0) +
        (issueDepth > 0 ? -20 : 0),
    ),
  );

  // Identify risk factors (same as in userMemory.jsw)
  const riskFactors = [];
  if (diveLogData.squeeze) riskFactors.push("squeeze-reported");
  if (issueDepth > 0) riskFactors.push("depth-issue");
  if (diveLogData.exit !== "Good") riskFactors.push("difficult-exit");
  if (reachedDepth > targetDepth * 1.1) riskFactors.push("depth-exceeded");

  // Extract technical notes (same as in userMemory.jsw)
  const technicalNotes = [];
  if (mouthfillDepth > 0)
    technicalNotes.push(`Mouthfill at ${mouthfillDepth}m`);
  if (diveLogData.issueComment)
    technicalNotes.push(`Issue: ${diveLogData.issueComment}`);
  if (diveLogData.surfaceProtocol)
    technicalNotes.push(`Surface: ${diveLogData.surfaceProtocol}`);

  // Create compressed logEntry structure
  const compressedLogEntry = {
    // Core dive data
    id: diveLogId,
    userId: userId,
    timestamp: timestamp,

    // Dive details
    dive: {
      date: diveLogData.date || "",
      disciplineType: diveLogData.disciplineType || "",
      discipline: diveLogData.discipline || "Freedive",
      location: diveLogData.location || "Unknown",
      depths: {
        target: targetDepth,
        reached: reachedDepth,
        mouthfill: mouthfillDepth,
        issue: issueDepth,
      },
      performance: {
        exit: diveLogData.exit || "",
        duration: diveLogData.durationOrDistance || "",
        totalTime: diveLogData.totalDiveTime || "",
        attemptType: diveLogData.attemptType || "",
        surfaceProtocol: diveLogData.surfaceProtocol || "",
      },
      issues: {
        squeeze: Boolean(diveLogData.squeeze),
        issueComment: diveLogData.issueComment || "",
      },
      notes: diveLogData.notes || "",
    },

    // AI analysis fields
    analysis: {
      progressionScore: progressionScore,
      riskFactors: riskFactors,
      technicalNotes: technicalNotes.join(" | "),
      depthAchievement: depthAchievement,
    },

    // Additional metadata
    metadata: {
      source: "koval-ai-widget",
      version: "2.0",
      type: "dive_log",
    },
  };

  // Create DiveLogs collection record (same structure as in userMemory.jsw)
  const diveLogRecord = {
    userId: userId,
    diveLogId: diveLogId,
    logEntry: JSON.stringify(compressedLogEntry), // Complete compressed structure
    diveDate: diveLogData.date ? new Date(diveLogData.date) : new Date(),
    diveTime: diveLogData.time || new Date().toLocaleTimeString(),
    diveLogWatch:
      diveLogData.photos ||
      diveLogData.watchPhoto ||
      diveLogData.diveLogWatch ||
      null,
    dataType: "dive_log",
    _createdDate: new Date(),
    _updatedDate: new Date(),
  };

  return { compressedLogEntry, diveLogRecord };
}

// Test with sample dive log data
const sampleDiveLog = {
  date: "2024-01-15",
  discipline: "Constant Weight",
  disciplineType: "CWT",
  location: "Blue Hole, Dahab",
  targetDepth: "30",
  reachedDepth: "28",
  mouthfillDepth: "15",
  issueDepth: "25",
  issueComment: "Slight equalization difficulty",
  exit: "Good",
  durationOrDistance: "2:15",
  totalDiveTime: "3:30",
  attemptType: "Training",
  surfaceProtocol: "Standard recovery",
  squeeze: false,
  notes: "Good training dive, felt comfortable overall",
  watchPhoto: "dive-watch-photo.jpg",
};

try {
  console.log("📊 Testing with sample dive log data...");

  const { compressedLogEntry, diveLogRecord } =
    createCompressedDiveLogStructure(sampleDiveLog);

  console.log("\n✅ Compressed LogEntry Structure:");
  console.log("=====================================");
  console.log(JSON.stringify(compressedLogEntry, null, 2));

  console.log("\n✅ DiveLogs Collection Record:");
  console.log("==============================");
  console.log("userId:", diveLogRecord.userId);
  console.log("diveLogId:", diveLogRecord.diveLogId);
  console.log("diveDate:", diveLogRecord.diveDate);
  console.log("diveTime:", diveLogRecord.diveTime);
  console.log("diveLogWatch:", diveLogRecord.diveLogWatch);
  console.log("dataType:", diveLogRecord.dataType);
  console.log("logEntry length:", diveLogRecord.logEntry.length, "characters");

  // Test parsing the compressed data
  const parsedLogEntry = JSON.parse(diveLogRecord.logEntry);

  console.log("\n🤖 AI Analysis Fields:");
  console.log("======================");
  console.log(
    "Progression Score:",
    parsedLogEntry.analysis.progressionScore + "%",
  );
  console.log(
    "Depth Achievement:",
    parsedLogEntry.analysis.depthAchievement.toFixed(1) + "%",
  );
  console.log(
    "Risk Factors:",
    parsedLogEntry.analysis.riskFactors.join(", ") || "None",
  );
  console.log(
    "Technical Notes:",
    parsedLogEntry.analysis.technicalNotes || "None",
  );

  console.log("\n🏊‍♂️ Dive Data Structure:");
  console.log("========================");
  console.log("Discipline:", parsedLogEntry.dive.discipline);
  console.log("Location:", parsedLogEntry.dive.location);
  console.log("Target Depth:", parsedLogEntry.dive.depths.target + "m");
  console.log("Reached Depth:", parsedLogEntry.dive.depths.reached + "m");
  console.log("Mouthfill Depth:", parsedLogEntry.dive.depths.mouthfill + "m");
  console.log("Exit Quality:", parsedLogEntry.dive.performance.exit);
  console.log("Has Photo:", !!diveLogRecord.diveLogWatch);

  console.log("\n🎉 SUCCESS: Compressed structure created successfully!");
  console.log(
    "📈 This structure is perfect for AI analysis and sidebar display",
  );
  console.log("💾 Ready to be saved to DiveLogs collection with photo");
} catch (error) {
  console.error("❌ Error creating compressed structure:", error);
}
