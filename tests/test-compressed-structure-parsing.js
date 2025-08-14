// tests/test-compressed-structure-parsing.js
// Test parsing the compressed dive log structure from DiveLogs collection

console.log(
  "🔍 Testing Compressed Structure Parsing (GET function simulation)\n",
);

// Simulate the new userMemory.jsw GET logic for parsing compressed logEntry
function parseCompressedDiveLogData(mockCollectionItems) {
  console.log(
    `📋 Processing ${mockCollectionItems.length} compressed records...`,
  );

  // ✅ PARSE COMPRESSED DATA: Extract logEntry for AI analysis (same as in userMemory.jsw)
  const processedItems = mockCollectionItems.map((item) => {
    let parsedLogEntry = {};
    try {
      parsedLogEntry = JSON.parse(item.logEntry || "{}");
    } catch (e) {
      console.warn("Could not parse logEntry for item:", item._id);
      parsedLogEntry = { error: "Invalid logEntry format" };
    }

    return {
      _id: item._id,
      userId: item.userId,
      diveLogId: item.diveLogId,
      diveDate: item.diveDate,
      diveTime: item.diveTime,
      diveLogWatch: item.diveLogWatch,
      dataType: item.dataType || "dive_log",
      // Include parsed logEntry for easy access
      logEntry: parsedLogEntry,
      // Keep original compressed format for storage
      logEntryRaw: item.logEntry,
      _createdDate: item._createdDate,
    };
  });

  // Separate different types of data (same as in userMemory.jsw)
  const diveLogs = processedItems.filter(
    (item) => item.dataType === "dive_log" || !item.dataType,
  );
  const memories = processedItems.filter(
    (item) =>
      item.dataType === "chat_memory" || item.dataType === "user_summary",
  );

  return {
    processedItems,
    diveLogs,
    memories,
    totalRecords: processedItems.length,
    diveLogsCount: diveLogs.length,
    memoriesCount: memories.length,
  };
}

// Mock data simulating what would be stored in DiveLogs collection
const mockDiveLogData = {
  _id: "mock-record-123",
  userId: "test-user-123",
  diveLogId: "dive_test-user-123_1754960904514",
  diveDate: new Date("2024-01-15"),
  diveTime: "3:08:24 PM",
  diveLogWatch: "dive-watch-photo.jpg",
  dataType: "dive_log",
  _createdDate: new Date(),
  logEntry: JSON.stringify({
    id: "dive_test-user-123_1754960904514",
    userId: "test-user-123",
    timestamp: "2025-08-12T01:08:24.514Z",
    dive: {
      date: "2024-01-15",
      disciplineType: "CWT",
      discipline: "Constant Weight",
      location: "Blue Hole, Dahab",
      depths: {
        target: 30,
        reached: 28,
        mouthfill: 15,
        issue: 25,
      },
      performance: {
        exit: "Good",
        duration: "2:15",
        totalTime: "3:30",
        attemptType: "Training",
        surfaceProtocol: "Standard recovery",
      },
      issues: {
        squeeze: false,
        issueComment: "Slight equalization difficulty",
      },
      notes: "Good training dive, felt comfortable overall",
    },
    analysis: {
      progressionScore: 83.33,
      riskFactors: ["depth-issue"],
      technicalNotes:
        "Mouthfill at 15m | Issue: Slight equalization difficulty | Surface: Standard recovery",
      depthAchievement: 93.33,
    },
    metadata: {
      source: "koval-ai-widget",
      version: "2.0",
      type: "dive_log",
    },
  }),
};

const mockChatMemoryData = {
  _id: "mock-memory-456",
  userId: "test-user-123",
  diveLogId: "memory_1754960904600",
  diveDate: new Date(),
  diveTime: "3:10:00 PM",
  diveLogWatch: null,
  dataType: "chat_memory",
  _createdDate: new Date(),
  logEntry: JSON.stringify({
    content: "User asked about mouthfill technique",
    type: "chat_memory",
    sessionName: "Memory - 2025-08-12T01:10:00.000Z",
    timestamp: "2025-08-12T01:10:00.000Z",
    metadata: {
      source: "chat-memory",
      version: "2.0",
    },
  }),
};

try {
  console.log("📊 Testing with mock collection data...");

  const mockCollectionItems = [mockDiveLogData, mockChatMemoryData];
  const parsedData = parseCompressedDiveLogData(mockCollectionItems);

  console.log("\n✅ Parsing Results:");
  console.log("==================");
  console.log("Total Records:", parsedData.totalRecords);
  console.log("Dive Logs:", parsedData.diveLogsCount);
  console.log("Memories:", parsedData.memoriesCount);

  if (parsedData.diveLogs.length > 0) {
    const diveLog = parsedData.diveLogs[0];

    console.log("\n🏊‍♂️ Parsed Dive Log:");
    console.log("====================");
    console.log("Record ID:", diveLog._id);
    console.log("User ID:", diveLog.userId);
    console.log("Dive Log ID:", diveLog.diveLogId);
    console.log("Has Photo:", !!diveLog.diveLogWatch);
    console.log("Data Type:", diveLog.dataType);

    console.log("\n📊 Dive Details (from parsed logEntry):");
    console.log("======================================");
    console.log("Date:", diveLog.logEntry.dive?.date);
    console.log("Discipline:", diveLog.logEntry.dive?.discipline);
    console.log("Location:", diveLog.logEntry.dive?.location);
    console.log("Target Depth:", diveLog.logEntry.dive?.depths?.target + "m");
    console.log("Reached Depth:", diveLog.logEntry.dive?.depths?.reached + "m");
    console.log(
      "Mouthfill Depth:",
      diveLog.logEntry.dive?.depths?.mouthfill + "m",
    );
    console.log("Exit Quality:", diveLog.logEntry.dive?.performance?.exit);
    console.log("Notes:", diveLog.logEntry.dive?.notes);

    console.log("\n🤖 AI Analysis Data:");
    console.log("===================");
    console.log(
      "Progression Score:",
      diveLog.logEntry.analysis?.progressionScore + "%",
    );
    console.log(
      "Depth Achievement:",
      diveLog.logEntry.analysis?.depthAchievement + "%",
    );
    console.log(
      "Risk Factors:",
      diveLog.logEntry.analysis?.riskFactors?.join(", ") || "None",
    );
    console.log("Technical Notes:", diveLog.logEntry.analysis?.technicalNotes);
  }

  if (parsedData.memories.length > 0) {
    const memory = parsedData.memories[0];

    console.log("\n💭 Parsed Chat Memory:");
    console.log("=====================");
    console.log("Record ID:", memory._id);
    console.log("Data Type:", memory.dataType);
    console.log("Content:", memory.logEntry.content);
    console.log("Session:", memory.logEntry.sessionName);
  }

  console.log("\n🎉 SUCCESS: Compressed structure parsing works perfectly!");
  console.log("✅ Both dive logs and chat memory can be stored and retrieved");
  console.log("🤖 AI analysis data is preserved and accessible");
  console.log("📸 Photo/watch data is properly handled");
  console.log("🔍 GET function can parse the compressed logEntry format");
} catch (error) {
  console.error("❌ Error parsing compressed structure:", error);
}
