// pages/api/analyze/save-dive-log.ts
import { NextApiRequest, NextApiResponse } from "next";
import handleCors from "@/utils/handleCors";
import { saveLogEntry } from "@/utils/diveLogHelpers"; // KEEP this import!
// import WIX_APP_CONFIG from "@/lib/wixAppConfig"; // Currently unused
import {
  compressDiveLogForWix,
  validateDiveLogData,
} from "@/utils/diveLogCompression";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // ✅ Handle CORS
    if (handleCors(req, res)) return;

    // ✅ Allow only POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const {
      userId = "anonymous",
      date = "",
      disciplineType = "",
      discipline = "",
      location = "",
      targetDepth = "",
      reachedDepth = "",
      mouthfillDepth = "",
      issueDepth = "",
      squeeze = false,
      exit = "",
      durationOrDistance = "",
      attemptType = "",
      notes = "",
      totalDiveTime = "",
      issueComment = "",
      surfaceProtocol = "",
    } = req.body || {};

    console.log("💾 Starting dual save process for dive log...");

    // 🚀 STEP 1: Save to LOCAL FILES first (super fast for AI)
    const localLogData: any = {
      id: `dive_${userId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId,
      date,
      disciplineType,
      discipline,
      location,
      targetDepth: parseFloat(targetDepth) || 0,
      reachedDepth: parseFloat(reachedDepth) || 0,
      mouthfillDepth: parseFloat(mouthfillDepth) || 0,
      issueDepth: parseFloat(issueDepth) || 0,
      squeeze,
      exit,
      durationOrDistance,
      attemptType,
      notes,
      totalDiveTime,
      issueComment,
      surfaceProtocol,
      syncedToWix: false, // Track sync status
      source: "dive-journal-form",
    };

    const localResult = await saveLogEntry(userId, localLogData);
    console.log("✅ Local save completed:", localResult.id);

    // ✅ Return success immediately - don't wait for Wix sync
    res.status(200).json({
      success: true,
      id: localResult.id,
      message: "Dive log saved successfully",
      syncStatus: "processing", // Indicates Wix sync is in progress
    });

    // 🌐 STEP 2: Sync to Wix DiveLogs Collection (Background processing)
    (async () => {
      try {
        console.log("🌐 Syncing dive log to Wix DiveLogs collection...");

        // ✅ Validate and compress data for Wix DiveLogs repeater
        validateDiveLogData(localLogData);
        const compressedData = compressDiveLogForWix(localLogData);

        // Check if compression was successful
        if (compressedData.error) {
          console.error("❌ Data compression failed:", compressedData.error);
          return;
        }

        console.log("📦 Compression stats:", {
          originalSize:
            "originalSize" in compressedData ? compressedData.originalSize : 0,
          compressedSize:
            "compressedSize" in compressedData
              ? compressedData.compressedSize
              : 0,
          ratio:
            "originalSize" in compressedData &&
            "compressedSize" in compressedData &&
            compressedData.originalSize
              ? `${(((compressedData.originalSize - compressedData.compressedSize) / compressedData.originalSize) * 100).toFixed(1)}%`
              : "N/A",
        });

        // 🚀 STEP 3: Save to Wix DiveLogs Collection via HTTP functions
        console.log("🌐 Calling Wix HTTP function for dive log save...");
        
        // 🚀 SIMPLIFIED: Format data for Wix HTTP function - keep it simple and efficient
        const wixDiveLogData = {
          // Required fields (matching DIVELOG_SCHEMA)
          userId: localLogData.userId,
          diveDate: localLogData.date,
          
          // Core dive data
          discipline: localLogData.discipline || localLogData.disciplineType || 'freediving',
          reachedDepth: parseFloat(localLogData.reachedDepth) || 0,
          targetDepth: parseFloat(localLogData.targetDepth) || 0,
          diveTime: localLogData.totalDiveTime || '',
          location: localLogData.location || '',
          notes: localLogData.notes || '',
          
          // Additional dive metrics
          mouthfillDepth: parseFloat(localLogData.mouthfillDepth) || 0,
          issueDepth: parseFloat(localLogData.issueDepth) || 0,
          squeeze: Boolean(localLogData.squeeze),
          exit: localLogData.exit || '',
          attemptType: localLogData.attemptType || '',
          issueComment: localLogData.issueComment || '',
          surfaceProtocol: localLogData.surfaceProtocol || '',
          
          // Metadata for tracking
          submissionTimestamp: new Date().toISOString(),
          dataSource: 'vercel-dive-journal',
          syncVersion: '5.0'
        };

        console.log("📤 Sending to Wix HTTP function:", {
          userId: wixDiveLogData.userId,
          diveDate: wixDiveLogData.diveDate,
          discipline: wixDiveLogData.discipline,
          reachedDepth: wixDiveLogData.reachedDepth,
          location: wixDiveLogData.location
        });

        // Call Wix HTTP function for dive logs
        const wixResponse = await fetch(
          `https://www.deepfreediving.com/_functions/diveLogs`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Version": "master", // Use the master API version
            },
            body: JSON.stringify(wixDiveLogData),
          },
        );

        console.log("📥 Wix HTTP function response status:", wixResponse.status);

        if (wixResponse.ok) {
          const wixResult = await wixResponse.json();
          console.log("✅ Dive log synced to Wix DiveLogs collection successfully");
          console.log("   • Wix Item ID:", wixResult.data?._id || wixResult._id);
          console.log("   • Performance:", wixResult.performance?.duration || "N/A");

          // Update local log to mark as synced
          const updatedLogData = {
            ...localLogData,
            syncedToWix: true,
            wixId: wixResult.data?._id || wixResult._id,
            wixSyncTimestamp: new Date().toISOString(),
          };
          await saveLogEntry(userId, updatedLogData); // Update local copy
          
          console.log("✅ Complete dive log sync process finished successfully");
        } else {
          const errorText = await wixResponse.text();
          console.error("❌ Failed to sync to Wix DiveLogs via HTTP function:");
          console.error("   • Status:", wixResponse.status);
          console.error("   • Error:", errorText);
          
          // Try to parse error for more details
          try {
            const errorJson = JSON.parse(errorText);
            console.error("   • Details:", errorJson.details || errorJson.error);
            console.error("   • Validation:", errorJson.validation || "N/A");
          } catch {
            console.error("   • Raw error:", errorText);
          }
        }
      } catch (wixSyncError) {
        console.error("❌ Wix sync process failed:", wixSyncError);
      }
    })(); // End of background Wix sync

  } catch (error) {
    console.error("❌ Save dive log error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: "Failed to save dive log",
    });
  }
}
