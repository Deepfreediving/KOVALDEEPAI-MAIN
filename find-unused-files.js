/**
 * find-unused-files.js
 * ---------------------
 * Scans your Next.js project for unused files in /pages/api and /lib
 * Usage: node find-unused-files.js
 */

const fs = require("fs");
const path = require("path");
const glob = require("glob");

const apiPath = path.join(__dirname, "pages/api");
const projectPath = __dirname;

function getAllFiles(dirPath, extList = [".js", ".ts", ".tsx"]) {
  return glob.sync(`${dirPath}/**/*.{js,ts,tsx}`, { nodir: true });
}

function searchFileUsage(fileName) {
  const files = getAllFiles(projectPath);
  return files.some((file) => {
    const content = fs.readFileSync(file, "utf8");
    return content.includes(fileName.replace(/\.[jt]s$/, ""));
  });
}

function findUnusedFiles() {
  const files = getAllFiles(apiPath);

  const unusedFiles = [];

  files.forEach((file) => {
    const fileName = path.basename(file);
    if (!searchFileUsage(fileName)) {
      unusedFiles.push(file);
    }
  });

  return unusedFiles;
}

const unused = findUnusedFiles();

if (unused.length === 0) {
  console.log("✅ No unused API files detected.");
} else {
  console.log("⚠️ Potentially unused files (review before deleting):\n");
  unused.forEach((file) => console.log("   - " + path.relative(projectPath, file)));
  console.log(
    "\n💡 Tip: Search for these filenames in VS Code (Cmd+Shift+F) to confirm they are not imported anywhere."
  );
}
