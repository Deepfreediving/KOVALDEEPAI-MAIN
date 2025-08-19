// ===== 📄 utils/diveLogCompression.js =====
// Data compression utility for dive logs before sending to Wix repeater

/**
 * Compresses dive log data for efficient transmission to Wix repeater
 * Maps current field names to required Wix repeater format
 */
export const compressDiveLogForWix = (diveLogData) => {
  try {
    // Map to required Wix repeater fields: diveTime, watchedPhoto, diveDate, logEntry, diveLogId, userId
    const wixFormattedData = {
      diveLogId: diveLogData.id || diveLogData._id || generateDiveLogId(),
      userId: diveLogData.userId,
      diveDate: diveLogData.date,
      diveTime:
        diveLogData.totalDiveTime || diveLogData.durationOrDistance || "",
      watchedPhoto: diveLogData.imageUrl || diveLogData.imagePreview || null,
      logEntry: JSON.stringify({
        discipline: diveLogData.discipline || "",
        location: diveLogData.location || "",
        targetDepth: diveLogData.targetDepth || "",
        reachedDepth: diveLogData.reachedDepth || "",
        mouthfillDepth: diveLogData.mouthfillDepth || "",
        issueDepth: diveLogData.issueDepth || "",
        issueComment: diveLogData.issueComment || "",
        squeeze: diveLogData.squeeze || false,
        exit: diveLogData.exit || "",
        attemptType: diveLogData.attemptType || "",
        surfaceProtocol: diveLogData.surfaceProtocol || "",
        notes: diveLogData.notes || "",
        timestamp: diveLogData.timestamp || new Date().toISOString(),
      }),
    };

    // Compress the logEntry JSON string to reduce size
    const compressedLogEntry = compressJSON(wixFormattedData.logEntry);

    return {
      ...wixFormattedData,
      logEntry: compressedLogEntry,
      compressed: true,
      originalSize: JSON.stringify(diveLogData).length,
      compressedSize: JSON.stringify(wixFormattedData).length,
    };
  } catch (error) {
    console.error("❌ Dive log compression failed:", error);
    return {
      error: error.message,
      originalData: diveLogData,
    };
  }
};

/**
 * Decompresses dive log data from Wix repeater format back to full format
 */
export const decompressDiveLogFromWix = (wixData) => {
  try {
    if (!wixData.logEntry) {
      throw new Error("No logEntry found in Wix data");
    }

    // Decompress and parse the logEntry
    const decompressedLogEntry = decompressJSON(wixData.logEntry);
    const logData = JSON.parse(decompressedLogEntry);

    // Map back to standard dive log format
    return {
      id: wixData.diveLogId,
      userId: wixData.userId,
      date: wixData.diveDate,
      totalDiveTime: wixData.diveTime,
      imageUrl: wixData.watchedPhoto,
      ...logData, // Spread all the detailed fields
      syncedToWix: true,
      wixId: wixData._id,
    };
  } catch (error) {
    console.error("❌ Dive log decompression failed:", error);
    return {
      error: error.message,
      wixData: wixData,
    };
  }
};

/**
 * Simple JSON compression using string replacement
 */
const compressJSON = (jsonString) => {
  return jsonString
    .replace(/"/g, '"') // Use smart quotes
    .replace(/null/g, "ø") // Replace null with symbol
    .replace(/false/g, "f") // Replace false with f
    .replace(/true/g, "t") // Replace true with t
    .replace(/\s+/g, " ") // Compress whitespace
    .trim();
};

/**
 * Decompress JSON string
 */
const decompressJSON = (compressedString) => {
  return compressedString
    .replace(/"/g, '"') // Restore quotes
    .replace(/ø/g, "null") // Restore null
    .replace(/\bf\b/g, "false") // Restore false
    .replace(/\bt\b/g, "true"); // Restore true
};

/**
 * Generate unique dive log ID if none exists
 */
const generateDiveLogId = () => {
  return `dive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validate dive log data before compression
 */
export const validateDiveLogData = (diveLogData) => {
  const requiredFields = ["userId", "date"];
  const missingFields = requiredFields.filter((field) => !diveLogData[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }

  return true;
};

/**
 * Get compression statistics
 */
export const getCompressionStats = (originalData, compressedData) => {
  const originalSize = JSON.stringify(originalData).length;
  const compressedSize = JSON.stringify(compressedData).length;
  const compressionRatio = (
    ((originalSize - compressedSize) / originalSize) *
    100
  ).toFixed(1);

  return {
    originalSize,
    compressedSize,
    savedBytes: originalSize - compressedSize,
    compressionRatio: `${compressionRatio}%`,
  };
};

console.log("✅ Dive log compression utility loaded");
