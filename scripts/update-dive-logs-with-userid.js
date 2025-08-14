#!/usr/bin/env node

// ===== 📄 scripts/update-dive-logs-with-userid.js =====
// One-time script to update existing dive logs with proper user IDs
// This will help associate your existing dive logs with your user account

const fs = require("fs");
const path = require("path");

// Configuration - UPDATE THIS WITH YOUR ACTUAL USER ID
const YOUR_USER_ID = "2ac69a3d-1838-4a13-b118-4712b45d1b41"; // Replace with your actual Wix user ID
const DIVE_LOGS_DIR = path.join(__dirname, "..", "data", "diveLogs");
const BACKUP_DIR = path.join(__dirname, "..", "data", "diveLogs_backup");

async function updateDiveLogsWithUserId() {
  console.log("🔄 Starting dive log user ID update process...");
  console.log(`📍 Target User ID: ${YOUR_USER_ID}`);
  console.log(`📁 Dive logs directory: ${DIVE_LOGS_DIR}`);

  try {
    // Create backup directory
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(`✅ Created backup directory: ${BACKUP_DIR}`);
    }

    // Check if dive logs directory exists
    if (!fs.existsSync(DIVE_LOGS_DIR)) {
      console.error("❌ Dive logs directory not found:", DIVE_LOGS_DIR);
      return;
    }

    const files = fs.readdirSync(DIVE_LOGS_DIR);
    const jsonFiles = files.filter(
      (file) => file.endsWith(".json") && !file.includes("/"),
    );

    console.log(`📊 Found ${jsonFiles.length} dive log files to process`);

    if (jsonFiles.length === 0) {
      console.log("ℹ️ No JSON files found to process");
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;
    const processedFiles = [];

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(DIVE_LOGS_DIR, file);
        const backupPath = path.join(BACKUP_DIR, file);

        // Read original file
        const content = fs.readFileSync(filePath, "utf8");
        const diveLog = JSON.parse(content);

        // Create backup
        fs.copyFileSync(filePath, backupPath);

        // Check if file needs updating
        if (diveLog.userId === YOUR_USER_ID) {
          console.log(`⏭️ Skipping ${file} - already has correct userId`);
          skippedCount++;
          continue;
        }

        // Log what we're updating
        console.log(`📝 Processing: ${file}`);
        console.log(
          `   Dive: ${diveLog.discipline || "Unknown"} - ${diveLog.reachedDepth || "Unknown"}m at ${diveLog.location || "Unknown location"}`,
        );
        console.log(`   Date: ${diveLog.date || "Unknown date"}`);

        // Update the dive log with user ID
        const updatedDiveLog = {
          ...diveLog,
          userId: YOUR_USER_ID,
          updatedAt: new Date().toISOString(),
          originalFile: file,
          userIdAddedBy: "update-script",
        };

        // Write updated file
        fs.writeFileSync(filePath, JSON.stringify(updatedDiveLog, null, 2));

        updatedCount++;
        processedFiles.push({
          file,
          discipline: diveLog.discipline,
          depth: diveLog.reachedDepth,
          location: diveLog.location,
          date: diveLog.date,
        });

        console.log(`✅ Updated: ${file}`);
      } catch (fileError) {
        console.error(`❌ Error processing file ${file}:`, fileError.message);
      }
    }

    console.log("\n📊 ===== UPDATE SUMMARY =====");
    console.log(`✅ Updated: ${updatedCount} files`);
    console.log(`⏭️ Skipped: ${skippedCount} files`);
    console.log(`📂 Backups created in: ${BACKUP_DIR}`);

    if (processedFiles.length > 0) {
      console.log("\n📝 Updated dive logs:");
      processedFiles.forEach(({ file, discipline, depth, location, date }) => {
        console.log(
          `   • ${discipline} - ${depth}m at ${location} (${date}) - ${file}`,
        );
      });
    }

    console.log("\n🎯 Next steps:");
    console.log(
      '1. Test the API: curl "http://localhost:3000/api/analyze/dive-logs?userId=' +
        YOUR_USER_ID +
        '"',
    );
    console.log("2. Run the sync script to upload to Wix UserMemory");
    console.log("3. Test the AI chat to see if it can access your dive logs");
  } catch (error) {
    console.error("❌ Update failed:", error);
  }
}

// Run the update
updateDiveLogsWithUserId();
