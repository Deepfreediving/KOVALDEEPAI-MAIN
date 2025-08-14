// ===== 📄 sync-dive-logs.js =====
// Enhanced utility script to sync dive logs to Wix UserMemory collection
// This will populate the UserMemory collection with your properly tagged dive logs

import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const WIX_ENDPOINT = "https://www.deepfreediving.com/_functions/userMemory";
const LOCAL_DIVE_LOGS_DIR = path.join(__dirname, "data", "diveLogs");

// ❌ DO NOT HARDCODE USER ID - Get it dynamically from authenticated user
// const USER_ID = '2ac69a3d-1838-4a13-b118-4712b45d1b41'; // ❌ This is wrong!

// ✅ Function to get authenticated user ID from Wix
async function getAuthenticatedUserId() {
  try {
    // Call Wix backend to get current authenticated user
    const response = await fetch(
      "https://www.deepfreediving.com/_functions/getUserProfile",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    if (response.ok) {
      const userData = await response.json();
      if (userData.success && userData.user && userData.user.id) {
        console.log(`✅ Found authenticated user: ${userData.user.id}`);
        return userData.user.id;
      }
    }

    console.error("❌ No authenticated user found");
    return null;
  } catch (error) {
    console.error("❌ Error getting authenticated user:", error.message);
    return null;
  }
}

async function syncDiveLogsToWix() {
  console.log("🚀 Starting dive logs sync to Wix UserMemory collection...");

  // ✅ STEP 1: Get the authenticated user's ID
  const USER_ID = await getAuthenticatedUserId();
  if (!USER_ID) {
    console.error("❌ Cannot sync - no authenticated user found");
    console.log("💡 Make sure you are logged into your Wix site first");
    return;
  }

  console.log(`👤 Syncing dive logs for user: ${USER_ID}`);

  try {
    // Read local dive logs
    if (!fs.existsSync(LOCAL_DIVE_LOGS_DIR)) {
      console.error("❌ Dive logs directory not found:", LOCAL_DIVE_LOGS_DIR);
      return;
    }

    const files = fs.readdirSync(LOCAL_DIVE_LOGS_DIR);
    const diveLogFiles = files.filter((file) => file.endsWith(".json"));

    console.log(`📊 Found ${diveLogFiles.length} dive log files`);

    let syncedCount = 0;
    let skippedCount = 0;

    for (const file of diveLogFiles) {
      try {
        const filePath = path.join(LOCAL_DIVE_LOGS_DIR, file);
        const stat = fs.statSync(filePath);

        // Skip directories - process only files
        if (stat.isDirectory()) {
          console.log(`📁 Skipping directory: ${file}`);
          continue;
        }

        const content = fs.readFileSync(filePath, "utf8");
        const diveLog = JSON.parse(content);

        // ✅ Only sync logs that belong to our user
        if (diveLog.userId && diveLog.userId !== USER_ID) {
          console.log(
            `⏭️ Skipping ${file} - belongs to different user (${diveLog.userId})`,
          );
          skippedCount++;
          continue;
        }

        // ✅ Skip logs that don't have proper dive data
        if (!diveLog.discipline || !diveLog.reachedDepth) {
          console.log(`⏭️ Skipping ${file} - missing essential dive data`);
          skippedCount++;
          continue;
        }

        console.log(
          `📝 Processing: ${diveLog.discipline} dive on ${diveLog.date} (${diveLog.reachedDepth}m)`,
        );

        // ✅ Enhanced format for UserMemory collection
        const memoryEntry = {
          userId: USER_ID,
          memoryContent: `Dive Log: ${diveLog.discipline} at ${diveLog.location}, reached ${diveLog.reachedDepth}m (target: ${diveLog.targetDepth}m). ${diveLog.notes || "No additional notes."}`,
          logEntry: JSON.stringify(diveLog), // ✅ Store complete dive log as JSON
          sessionName: `Dive Log - ${diveLog.date}`,
          timestamp: diveLog.timestamp || new Date().toISOString(),
          metadata: {
            type: "dive-log",
            source: "local-sync-enhanced",
            originalFile: file,
            discipline: diveLog.discipline,
            location: diveLog.location,
            targetDepth: diveLog.targetDepth,
            reachedDepth: diveLog.reachedDepth,
            date: diveLog.date,
            mouthfillDepth: diveLog.mouthfillDepth,
            issueDepth: diveLog.issueDepth,
            notes: diveLog.notes,
            totalDiveTime: diveLog.totalDiveTime,
            surfaceProtocol: diveLog.surfaceProtocol,
            exit: diveLog.exit,
            userId: diveLog.userId, // ✅ Include userId in metadata
          },
        };

        // Send to Wix
        const response = await fetch(WIX_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(memoryEntry),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(
            `✅ Synced: ${diveLog.discipline} dive (${diveLog.reachedDepth}m)`,
          );
          syncedCount++;
        } else {
          const error = await response.text();
          console.error(`❌ Failed to sync ${file}:`, response.status, error);
        }

        // Small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (fileError) {
        console.error(`❌ Error processing file ${file}:`, fileError.message);
      }
    }

    console.log(
      `✅ Sync completed! ${syncedCount}/${diveLogFiles.length} dive logs synced to Wix`,
    );
    console.log(
      `⏭️ Skipped: ${skippedCount} files (wrong user or missing data)`,
    );
    console.log(
      "🔍 Check your UserMemory collection in Wix CMS to verify the data",
    );
    console.log("\n🎯 Next steps:");
    console.log(
      '1. Test API: curl "http://localhost:3000/api/analyze/dive-logs?userId=' +
        USER_ID +
        '"',
    );
    console.log("2. Test AI chat to see if it can access your dive logs");
    console.log("3. Check Wix UserMemory collection for the synced data");
  } catch (error) {
    console.error("❌ Sync failed:", error);
  }
}

// Run the sync
syncDiveLogsToWix();
